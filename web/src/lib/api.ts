import { readItems, createItem } from '@directus/sdk'
import { directus } from './directus'
import type { RenderData, Invitation, Template, Brief } from '../types'

// Gửi form intake → tạo bản ghi briefs (status mặc định 'new').
export async function createBrief(payload: Partial<Brief>) {
  return await directus.request(createItem('briefs', payload))
}

// Danh sách mẫu đang mở bán (cho trang thư viện mẫu).
export async function fetchTemplates(): Promise<Template[]> {
  return await directus.request(
    readItems('templates', { filter: { is_active: { _eq: true } }, sort: ['sort'], fields: ['*'] }),
  )
}

// Một mẫu theo slug (cho trang preview).
export async function fetchTemplateBySlug(slug: string): Promise<Template | null> {
  const r = await directus.request(readItems('templates', { filter: { slug: { _eq: slug } }, limit: 1, fields: ['*'] }))
  return r[0] ?? null
}

// Đọc thiệp public theo slug của variant. Vì schema chỉ có quan hệ M2O (chưa tạo alias O2M),
// ta truy vấn tách theo invitation id — chạy tốt mà không cần alias, dễ hiểu.
export async function fetchInvitationBySlug(slug: string): Promise<RenderData | null> {
  const variants = await directus.request(
    readItems('invitation_variants', { filter: { slug: { _eq: slug } }, limit: 1, fields: ['*'] }),
  )
  const variant = variants[0]
  if (!variant?.invitation) return null

  const invId = variant.invitation
  const invs = await directus.request(
    readItems('invitations', {
      filter: { id: { _eq: invId }, status: { _eq: 'published' } },
      limit: 1,
      fields: ['*'],
    }),
  )
  const invitation = invs[0] as Invitation | undefined
  if (!invitation) return null

  const [events, photos, gift_accounts, templates] = await Promise.all([
    directus.request(readItems('events', { filter: { invitation: { _eq: invId } }, sort: ['sort'], fields: ['*'] })),
    directus.request(readItems('photos', { filter: { invitation: { _eq: invId } }, sort: ['sort'], fields: ['*'] })),
    directus.request(readItems('gift_accounts', { filter: { invitation: { _eq: invId } }, fields: ['*'] })),
    invitation.template
      ? directus.request(readItems('templates', { filter: { id: { _eq: invitation.template } }, limit: 1, fields: ['*'] }))
      : Promise.resolve([] as Template[]),
  ])

  return {
    invitation,
    template: (templates as Template[])[0] ?? null,
    events,
    photos,
    gift_accounts,
    variant,
  }
}
