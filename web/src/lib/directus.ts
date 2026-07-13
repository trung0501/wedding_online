import { createDirectus, rest } from '@directus/sdk'
import type { Schema } from '../types'

const url = import.meta.env.VITE_DIRECTUS_URL ?? 'http://localhost:8055'

// Client public (read-only) dùng REST. Auth cho dashboard sẽ thêm ở Phase 4.
export const directus = createDirectus<Schema>(url).with(rest())

export const DIRECTUS_URL = url

// Ảnh: nếu là URL đầy đủ (dữ liệu demo) thì giữ nguyên; nếu là id file Directus thì build link /assets.
export function assetUrl(fileId: string | null | undefined): string {
  if (!fileId) return ''
  if (/^https?:\/\//.test(fileId)) return fileId
  return `${DIRECTUS_URL}/assets/${fileId}`
}
