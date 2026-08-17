// ============================================================
//  Đăng nhập cho tài khoản "Chủ thiệp" (cặp đôi khách hàng).
//
//  Dùng client Directus RIÊNG, tách khỏi client public ở directus.ts:
//    - directus.ts  → không đăng nhập, dùng cho thư viện mẫu và renderer thiệp
//    - auth.ts      → có đăng nhập, chỉ dùng cho trang /quan-ly
//  Tách ra để một request lỗi token không làm hỏng trang thiệp công khai.
//
//  Token lưu ở localStorage. Đủ an toàn cho việc xem danh sách khách mời;
//  nếu sau này cần chặt hơn thì chuyển sang cookie httpOnly, nhưng khi đó
//  phải cấu hình thêm vì frontend và Directus nằm ở hai tên miền con khác nhau.
// ============================================================

import { createDirectus, rest, authentication, readMe, readItems, updateMe } from '@directus/sdk'
import type { Schema, Invitation, Rsvp, GuestbookEntry } from '../types'
import { DIRECTUS_URL } from './directus'

const STORAGE_KEY = 'wedding_client_auth'

// Lưu token vào localStorage để đóng trình duyệt mở lại vẫn còn phiên.
const storage = {
  get: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  },
  set: (value: unknown) => {
    try {
      value ? localStorage.setItem(STORAGE_KEY, JSON.stringify(value)) : localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* trình duyệt chặn localStorage (chế độ ẩn danh) — phiên chỉ sống trong tab */
    }
  },
}

export const clientDirectus = createDirectus<Schema>(DIRECTUS_URL)
  .with(authentication('json', { storage, autoRefresh: true }))
  .with(rest())

export interface ClientUser {
  id: string
  first_name: string | null
  last_name: string | null
  email: string
}

export async function login(email: string, password: string) {
  await clientDirectus.login({ email, password })
}

export async function logout() {
  try {
    await clientDirectus.logout()
  } catch {
    /* token đã hết hạn thì thôi, vẫn coi như đã đăng xuất */
  }
  storage.set(null)
}

export async function fetchMe(): Promise<ClientUser | null> {
  try {
    const me = await clientDirectus.request(readMe({ fields: ['id', 'first_name', 'last_name', 'email'] }))
    return me as unknown as ClientUser
  } catch {
    return null
  }
}

export async function changePassword(password: string) {
  await clientDirectus.request(updateMe({ password }))
}

// ---------- Dữ liệu cho trang quản lý ----------

export interface ManageData {
  invitation: Invitation | null
  variants: { id: string; variant_type: string; slug: string }[]
  rsvps: Rsvp[]
  guestbook: GuestbookEntry[]
}

/**
 * Lấy toàn bộ dữ liệu trang quản lý.
 *
 * Không cần truyền id thiệp: policy "Chủ thiệp" đã lọc sẵn theo
 * client_user = người đang đăng nhập. Gọi trần và Directus chỉ trả về
 * đúng phần của họ — bộ lọc nằm ở server, không phải ở đây.
 */
export async function fetchManageData(): Promise<ManageData> {
  const [invs, variants, rsvps, guestbook] = await Promise.all([
    clientDirectus.request(readItems('invitations', { limit: 1, fields: ['*'] })),
    clientDirectus.request(readItems('invitation_variants', { limit: -1, fields: ['*'] })).catch(() => []),
    clientDirectus.request(readItems('rsvps', { limit: -1, sort: ['-date_created'], fields: ['*'] })).catch(() => []),
    clientDirectus.request(readItems('guestbook', { limit: -1, sort: ['-date_created'], fields: ['*'] })).catch(() => []),
  ])

  return {
    invitation: (invs as Invitation[])[0] ?? null,
    variants: variants as ManageData['variants'],
    rsvps: rsvps as Rsvp[],
    guestbook: guestbook as GuestbookEntry[],
  }
}

// ---------- Thống kê ----------

export interface Stats {
  confirmed: number
  totalPeople: number
  declined: number
  messages: number
  groomSide: number
  brideSide: number
}

export function computeStats(rsvps: Rsvp[], guestbook: GuestbookEntry[]): Stats {
  const yes = rsvps.filter((r) => r.attending === 'yes')
  return {
    confirmed: yes.length,
    // num_guests là TỔNG số người của lượt đó (gồm cả người điền form).
    totalPeople: yes.reduce((sum, r) => sum + (r.num_guests || 1), 0),
    declined: rsvps.filter((r) => r.attending === 'no').length,
    messages: rsvps.filter((r) => r.message?.trim()).length + guestbook.filter((g) => g.message?.trim()).length,
    groomSide: yes.filter((r) => r.side === 'groom').length,
    brideSide: yes.filter((r) => r.side === 'bride').length,
  }
}
