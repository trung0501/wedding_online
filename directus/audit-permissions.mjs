// ============================================================
//  P1 (còn nợ) — SOI quyền của Public role trong Directus.
//
//  CHỈ ĐỌC. Script này không ghi bất cứ thứ gì vào Directus.
//  Mục đích: nhìn rõ Public đang được cấp gì trước khi siết lại
//  theo mục 6 tài liệu thiết kế.
//
//  CHẠY (Directus đang chạy, từ thư mục gốc):
//    node --env-file=.env directus/audit-permissions.mjs
//    node --env-file=.env directus/audit-permissions.mjs --json   # kèm xuất file
// ============================================================

import { writeFileSync } from 'node:fs'

const URL = (process.env.DIRECTUS_URL || process.env.PUBLIC_URL || 'http://localhost:8055').replace(/\/$/, '')
const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD
const WRITE_JSON = process.argv.includes('--json')

async function api(path, { method = 'GET', body, token, allow404 = false } = {}) {
  const res = await fetch(URL + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 404 && allow404) return null
  const raw = await res.text()
  let data
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = raw
  }
  if (!res.ok) {
    if (allow404) return null
    throw new Error(`${method} ${path} → ${res.status}: ${data?.errors?.[0]?.message || res.statusText}`)
  }
  return data
}

async function getToken() {
  if (process.env.DIRECTUS_TOKEN) return process.env.DIRECTUS_TOKEN
  if (!EMAIL || !PASSWORD) throw new Error('Thiếu ADMIN_EMAIL/ADMIN_PASSWORD. Chạy kèm --env-file=.env')
  const r = await api('/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })
  return r.data.access_token
}

// ---------- Kỳ vọng theo mục 6 tài liệu thiết kế ----------

// Public ĐƯỢC phép — ngoài danh sách này đều là thừa.
const ALLOWED = {
  briefs: ['create'],
  brief_photos: ['create'],
  rsvps: ['create'],
  guestbook: ['create'],
  templates: ['read'],
  template_categories: ['read'],
  invitations: ['read'],
  invitation_variants: ['read'],
  events: ['read'],
  photos: ['read'],
  gift_accounts: ['read'],
  directus_files: ['read'], // bắt buộc, nếu không /assets/<id> sẽ 403 → ảnh không hiện
}

// Collection tuyệt đối không được lộ ra ngoài.
const FORBIDDEN = ['orders', 'guests', 'invitation_views', 'directus_users']

// Read bắt buộc phải có filter, nếu không sẽ lộ bản nháp.
const MUST_FILTER = {
  invitations: 'status = published',
  templates: 'is_active = true',
}

// Field nhạy cảm, không được nằm trong danh sách field public đọc được.
const SENSITIVE_FIELDS = {
  briefs: ['contact_phone', 'contact_name', 'contact_channel', 'wish'],
  guests: ['phone', 'note', 'token'],
  orders: ['amount', 'note', 'method'],
}

const isEmptyFilter = (f) => !f || (typeof f === 'object' && Object.keys(f).length === 0)
const fieldsLabel = (f) => (!f || f.length === 0 ? '(không field nào)' : f.includes('*') ? '* (TẤT CẢ)' : f.join(', '))

async function main() {
  console.log(`▶ Directus: ${URL}`)
  const token = await getToken()

  // --- Tìm policy gắn với Public (Directus 11: directus_access có role=null & user=null) ---
  let policyIds = []
  let mode = 'v11'
  const access = await api('/access?filter[role][_null]=true&filter[user][_null]=true&fields=id,policy&limit=-1', {
    token,
    allow404: true,
  })

  if (access?.data?.length) {
    policyIds = access.data.map((a) => (typeof a.policy === 'object' ? a.policy?.id : a.policy)).filter(Boolean)
  } else {
    mode = 'v10'
  }

  let perms = []
  if (mode === 'v11' && policyIds.length) {
    const q = policyIds.map((id) => `filter[policy][_in][]=${encodeURIComponent(id)}`).join('&')
    const r = await api(`/permissions?${q}&limit=-1&fields=*`, { token })
    perms = r?.data ?? []
  } else {
    // Directus 10 hoặc chưa có access row: permissions gắn thẳng role=null
    const r = await api('/permissions?filter[role][_null]=true&limit=-1&fields=*', { token, allow404: true })
    perms = r?.data ?? []
    mode = 'v10'
  }

  console.log(`▶ Chế độ: ${mode === 'v11' ? 'Directus 11 (policies)' : 'role=null (Directus 10 / chưa có policy)'}`)
  console.log(`▶ Tìm thấy ${policyIds.length} policy public, ${perms.length} bản ghi permission\n`)

  if (perms.length === 0) {
    console.log('⚠️  Public KHÔNG có quyền nào. Nếu trang thư viện mẫu và form intake vẫn chạy được,')
    console.log('   có thể quyền nằm ở policy khác — kiểm tra Settings → Access Policies trong admin.\n')
  }

  // --- Bảng hiện trạng ---
  const byCollection = {}
  for (const p of perms) (byCollection[p.collection] ??= []).push(p)

  console.log('═'.repeat(78))
  console.log('HIỆN TRẠNG — Public đang được cấp')
  console.log('═'.repeat(78))
  for (const col of Object.keys(byCollection).sort()) {
    console.log(`\n▸ ${col}`)
    for (const p of byCollection[col]) {
      const filter = isEmptyFilter(p.permissions) ? 'KHÔNG CÓ FILTER' : JSON.stringify(p.permissions)
      console.log(`    ${p.action.padEnd(7)} │ field: ${fieldsLabel(p.fields)}`)
      console.log(`    ${' '.repeat(7)} │ filter: ${filter}`)
    }
  }
  if (Object.keys(byCollection).length === 0) console.log('\n  (trống)')

  // --- Rà rủi ro ---
  const problems = []
  const notes = []

  for (const p of perms) {
    const col = p.collection
    const allowedActions = ALLOWED[col]

    if (FORBIDDEN.includes(col)) {
      problems.push(`NGHIÊM TRỌNG · ${col}.${p.action} — collection này không được lộ cho Public`)
      continue
    }
    if (!allowedActions) {
      problems.push(`THỪA · ${col}.${p.action} — không nằm trong mục 6, nên gỡ`)
      continue
    }
    if (!allowedActions.includes(p.action)) {
      const sev = p.action === 'read' && SENSITIVE_FIELDS[col] ? 'NGHIÊM TRỌNG' : 'THỪA'
      problems.push(`${sev} · ${col}.${p.action} — chỉ được phép: ${allowedActions.join(', ')}`)
      continue
    }
    if (p.action === 'read' && MUST_FILTER[col] && isEmptyFilter(p.permissions)) {
      problems.push(`NGHIÊM TRỌNG · ${col}.read — thiếu filter "${MUST_FILTER[col]}", đang lộ toàn bộ bản ghi`)
    }
    const sensitive = SENSITIVE_FIELDS[col]
    if (p.action === 'read' && sensitive) {
      const leaked = p.fields?.includes('*') ? sensitive : (p.fields ?? []).filter((f) => sensitive.includes(f))
      if (leaked.length) problems.push(`NGHIÊM TRỌNG · ${col}.read — lộ field nhạy cảm: ${leaked.join(', ')}`)
    }
    if (p.action === 'create' && p.fields?.includes('*')) {
      notes.push(`${col}.create đang cho ghi mọi field — nên giới hạn field khách được gửi`)
    }
  }

  // --- Thiếu quyền cần thiết ---
  const missing = []
  for (const [col, actions] of Object.entries(ALLOWED)) {
    for (const a of actions) {
      const has = perms.some((p) => p.collection === col && p.action === a)
      if (!has) missing.push(`${col}.${a}`)
    }
  }

  console.log('\n' + '═'.repeat(78))
  console.log('RÀ SOÁT')
  console.log('═'.repeat(78))

  if (problems.length) {
    console.log('\n❌ Vấn đề:')
    for (const p of problems.sort()) console.log(`   • ${p}`)
  } else {
    console.log('\n✅ Không thấy quyền thừa hay lộ dữ liệu.')
  }

  if (missing.length) {
    console.log('\n⚠️  Thiếu quyền (frontend sẽ lỗi hoặc trống):')
    for (const m of missing) {
      const hint = m === 'directus_files.read' ? '  ← thiếu cái này thì MỌI ẢNH đều 403' : ''
      console.log(`   • ${m}${hint}`)
    }
  } else {
    console.log('\n✅ Đủ các quyền cần thiết.')
  }

  if (notes.length) {
    console.log('\nℹ️  Nên cân nhắc:')
    for (const n of notes) console.log(`   • ${n}`)
  }

  if (WRITE_JSON) {
    const out = `directus/permissions-current.json`
    writeFileSync(out, JSON.stringify({ url: URL, mode, policyIds, permissions: perms }, null, 2), 'utf8')
    console.log(`\n💾 Đã ghi ${out}`)
  }

  console.log('\n▶ Script này KHÔNG thay đổi gì. Gửi kết quả trên để quyết bước siết quyền.\n')
}

main().catch((err) => {
  console.error('\n❌ Lỗi:', err.message)
  process.exit(1)
})
