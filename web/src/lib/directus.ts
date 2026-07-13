import { createDirectus, rest } from '@directus/sdk'
import type { Schema } from '../types'

const url = import.meta.env.VITE_DIRECTUS_URL ?? 'http://localhost:8055'

// Client public (read-only) dùng REST. Auth cho dashboard sẽ thêm ở Phase 4.
export const directus = createDirectus<Schema>(url).with(rest())

export const DIRECTUS_URL = url
