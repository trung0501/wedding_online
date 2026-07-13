import { readItems } from '@directus/sdk'
import { directus } from './directus'
import type { RenderData, Invitation, Template } from '../types'

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
