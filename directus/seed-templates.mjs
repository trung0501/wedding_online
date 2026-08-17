// ============================================================
//  Seed danh mục MẪU THIỆP vào Directus (idempotent theo slug).
//
//  Dữ liệu lấy từ directus/templates.json — đó là nguồn sự thật duy nhất.
//  Sửa tên/mô tả mẫu trong admin? Chạy export-templates.mjs để kéo về file
//  đó, đừng sửa tay hai nơi.
//
//  CHẠY (Directus đang chạy, từ thư mục gốc):
//    node --env-file=.env directus/seed-templates.mjs            # chỉ tạo mẫu còn thiếu
//    node --env-file=.env directus/seed-templates.mjs --update   # tạo mới + cập nhật mẫu đã có
//    node --env-file=.env directus/seed-templates.mjs --dry-run  # xem trước, không ghi
//
//  component_key phải khớp web/src/templates/registry.ts.
// ============================================================

import { readFileSync } from 'node:fs'

const URL = (process.env.DIRECTUS_URL || process.env.PUBLIC_URL || 'http://localhost:8055').replace(/\/$/, '')
const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD
const DATA = 'directus/templates.json'

const UPDATE = process.argv.includes('--update')
const DRY = process.argv.includes('--dry-run')

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

function loadTemplates() {
  let raw
  try {
    raw = readFileSync(DATA, 'utf8')
  } catch {
    throw new Error(`Không đọc được ${DATA}. Chạy script từ thư mục gốc dự án.`)
  }
  const rows = JSON.parse(raw)
  const seen = new Set()
  for (const t of rows) {
    if (!t.slug || !t.component_key) throw new Error(`Mẫu thiếu slug hoặc component_key: ${JSON.stringify(t)}`)
    if (seen.has(t.slug)) throw new Error(`Slug bị trùng trong ${DATA}: ${t.slug}`)
    seen.add(t.slug)
  }
  return rows
}

// So sánh nông, chỉ trên các khoá có trong file JSON.
function diffFields(existing, wanted) {
  const changed = []
  for (const [k, v] of Object.entries(wanted)) {
    const a = existing[k] ?? null
    const b = v ?? null
    if (JSON.stringify(a) !== JSON.stringify(b)) changed.push([k, a, b])
  }
  return changed
}

async function main() {
  console.log(`▶ Directus: ${URL}`)
  if (DRY) console.log('▶ CHẾ ĐỘ XEM TRƯỚC — không ghi gì\n')

  const templates = loadTemplates()
  console.log(`▶ ${templates.length} mẫu trong ${DATA}\n`)

  const token = await getToken()
  let created = 0, updated = 0, skipped = 0

  for (const t of templates) {
    const existed = await api(`/items/templates?filter[slug][_eq]=${encodeURIComponent(t.slug)}&limit=1&fields=*`, { token })
    const row = existed.data?.[0]

    if (!row) {
      console.log(`+ TẠO   ${t.slug} → "${t.name}"`)
      if (!DRY) await api('/items/templates', { method: 'POST', token, body: t })
      created++
      continue
    }

    const changed = diffFields(row, t)
    if (!changed.length) {
      skipped++
      continue
    }

    if (!UPDATE) {
      console.log(`• LỆCH  ${t.slug} — ${changed.map(([k]) => k).join(', ')}  (thêm --update để đồng bộ)`)
      skipped++
      continue
    }

    console.log(`~ SỬA   ${t.slug}`)
    for (const [k, a, b] of changed) console.log(`          ${k}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`)
    if (!DRY) await api(`/items/templates/${row.id}`, { method: 'PATCH', token, body: t })
    updated++
  }

  console.log(`\n▶ Tạo ${created} · Sửa ${updated} · Giữ nguyên ${skipped}`)
  if (DRY) console.log('\n▶ Mới chỉ xem trước. Bỏ --dry-run để áp dụng thật.')
  else console.log('\n✅ Xong. Mở lại trang thư viện mẫu để xem.')
}

main().catch((err) => {
  console.error('\n❌ Lỗi:', err.message)
  process.exit(1)
})
