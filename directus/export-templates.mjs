// ============================================================
//  Kéo danh mục MẪU THIỆP từ Directus về file directus/templates.json.
//
//  Dùng khi anh sửa tên / mô tả / thứ tự mẫu trong admin và muốn
//  code khớp lại với thực tế — tránh cảnh Directus một đằng, script một nẻo.
//
//  CHỈ ĐỌC Directus. Chỉ ghi đúng một file JSON ở máy.
//
//  CHẠY (Directus đang chạy, từ thư mục gốc):
//    node --env-file=.env directus/export-templates.mjs
//
//  Sau đó nhớ commit directus/templates.json.
// ============================================================

import { writeFileSync, existsSync, readFileSync } from 'node:fs'

const URL = (process.env.DIRECTUS_URL || process.env.PUBLIC_URL || 'http://localhost:8055').replace(/\/$/, '')
const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD
const OUT = 'directus/templates.json'

// Cố tình BỎ: id, thumbnail, category — chúng là uuid riêng của từng lần cài,
// mang sang máy khác là sai. Thumbnail đã có ảnh tĩnh trong web/public/thumbs/ lo.
const EXPORT_FIELDS = [
  'name', 'slug', 'component_key', 'description',
  'badge', 'is_active', 'sort', 'price', 'demo_slug',
  'style_tokens', 'default_sections',
]

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(URL + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const raw = await res.text()
  let data
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = raw
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${data?.errors?.[0]?.message || res.statusText}`)
  return data
}

async function getToken() {
  if (process.env.DIRECTUS_TOKEN) return process.env.DIRECTUS_TOKEN
  if (!EMAIL || !PASSWORD) throw new Error('Thiếu ADMIN_EMAIL/ADMIN_PASSWORD. Chạy kèm --env-file=.env')
  const r = await api('/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })
  return r.data.access_token
}

async function main() {
  console.log(`▶ Directus: ${URL}`)
  const token = await getToken()

  const r = await api(`/items/templates?limit=-1&sort=sort&fields=${EXPORT_FIELDS.join(',')}`, { token })
  const rows = r?.data ?? []
  if (!rows.length) throw new Error('Không có mẫu nào trong Directus. Chạy seed-templates.mjs trước.')

  // Chuẩn hoá thứ tự khoá cho ổn định, tránh git diff nhiễu mỗi lần export.
  const cleaned = rows.map((t) => {
    const o = {}
    for (const f of EXPORT_FIELDS) if (t[f] !== undefined && t[f] !== null) o[f] = t[f]
    return o
  })

  const before = existsSync(OUT) ? readFileSync(OUT, 'utf8') : ''
  const after = JSON.stringify(cleaned, null, 2) + '\n'

  writeFileSync(OUT, after, 'utf8')

  console.log(`\n✓ Đã kéo ${cleaned.length} mẫu về ${OUT}`)
  for (const t of cleaned) console.log(`   · ${t.slug.padEnd(22)} → "${t.name}"`)

  if (before === after) {
    console.log('\n• File không đổi — code đang khớp với Directus.')
  } else {
    console.log('\n⚠️  File có thay đổi. Xem lại rồi commit:')
    console.log('    git diff directus/templates.json')
  }
}

main().catch((err) => {
  console.error('\n❌ Lỗi:', err.message)
  process.exit(1)
})
