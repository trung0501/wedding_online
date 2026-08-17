import { createDirectus, rest } from '@directus/sdk'
import type { Schema } from '../types'

const url = import.meta.env.VITE_DIRECTUS_URL ?? 'http://localhost:8055'

// Client public (read-only) dùng REST.
export const directus = createDirectus<Schema>(url).with(rest())

export const DIRECTUS_URL = url

// ============================================================
//  KÍCH THƯỚC ẢNH
//
//  Directus resize ảnh ngay khi có request và cache lại bản đã resize.
//  Không truyền tham số thì nó trả về ẢNH GỐC — ảnh 4000x3000 nặng 3MB
//  từ điện thoại khách sẽ được gửi nguyên xi rồi trình duyệt mới thu nhỏ
//  về ô 200px. Một album 100 ảnh = 300MB, mở trên 4G là treo.
//
//  Mỗi vị trí hiển thị có một preset riêng. Số đo lấy gấp đôi kích thước
//  hiển thị thực tế để nét trên màn hình retina.
// ============================================================

const PRESETS = {
  /** Ảnh trong album "Khoảnh khắc" — ô 3:4, hiển thị ~270px trên desktop */
  album: { width: 600, height: 750, fit: 'cover' },
  /** Ảnh bìa hero — tràn viền toàn màn hình */
  cover: { width: 1600 },
  /** Nửa ảnh của bố cục split — chỉ chiếm 50% bề ngang */
  coverSplit: { width: 1000 },
  /** Mã QR mừng cưới — ô nhỏ, nhưng cần nét để quét được */
  qr: { width: 420 },
  /** Ảnh preview mẫu ở trang thư viện — ô 3:4 */
  card: { width: 600, height: 800, fit: 'cover' },
  /** Ảnh khi share lên Zalo/Facebook. 1200x630 là cỡ hai nền tảng này hiển thị đẹp nhất. */
  og: { width: 1200, height: 630, fit: 'cover' },
} as const

export type ImagePreset = keyof typeof PRESETS

/**
 * Dựng URL ảnh từ id file Directus.
 * - Dữ liệu mẫu dùng URL đầy đủ (unsplash, picsum) → trả nguyên, không đụng vào.
 * - Không truyền preset → ảnh gốc. Chỉ dùng khi thật sự cần bản đầy đủ.
 */
export function assetUrl(fileId: string | null | undefined, preset?: ImagePreset): string {
  if (!fileId) return ''
  if (/^https?:\/\//.test(fileId)) return fileId

  const base = `${DIRECTUS_URL}/assets/${fileId}`
  if (!preset) return base

  const p = PRESETS[preset]
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(p)) params.set(k, String(v))
  // format=auto: Directus tự chọn WebP nếu trình duyệt hỗ trợ, không thì JPEG.
  params.set('format', 'auto')
  params.set('quality', '80')
  // withoutEnlargement: ảnh gốc nhỏ hơn preset thì giữ nguyên, không phóng to vỡ hạt.
  params.set('withoutEnlargement', 'true')

  return `${base}?${params.toString()}`
}
