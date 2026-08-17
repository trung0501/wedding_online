// ============================================================
//  Bổ sung 2 field cho collection `briefs`:
//    · contact_email — popup "Nhận tư vấn" có hỏi email
//    · source        — phân biệt khách đến từ form đặt thiệp hay popup tư vấn
//
//  CHẠY (Directus đang chạy, từ thư mục gốc):
//    node --env-file=.env directus/add-brief-fields.mjs
//
//  Idempotent: field đã có thì bỏ qua.
//  Chạy xong nhớ chạy lại setup-permissions.mjs để Public được ghi field mới.
// ============================================================

const URL = (process.env.DIRECTUS_URL || process.env.PUBLIC_URL || 'http://localhost:8055').replace(/\/$/, '')
const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD

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

const FIELDS = [
  {
    field: 'contact_email',
    type: 'string',
    meta: {
      interface: 'input',
      options: { placeholder: 'email@example.com' },
      note: 'Email khách để lại (không bắt buộc)',
      sort: 4,
      width: 'half',
    },
    schema: { is_nullable: true },
  },
  {
    field: 'source',
    type: 'string',
    meta: {
      interface: 'select-dropdown',
      options: {
        choices: [
          { text: 'Form đặt thiệp', value: 'intake' },
          { text: 'Popup nhận tư vấn', value: 'consult' },
        ],
      },
      display: 'labels',
      note: 'Khách đến từ đâu',
      sort: 5,
      width: 'half',
    },
    schema: { default_value: 'intake', is_nullable: true },
  },
]

async function main() {
  console.log(`▶ Directus: ${URL}`)
  const token = await getToken()

  const existing = (await api('/fields/briefs', { token })).data.map((f) => f.field)

  for (const f of FIELDS) {
    if (existing.includes(f.field)) {
      console.log(`• field đã có: briefs.${f.field}`)
      continue
    }
    await api('/fields/briefs', { method: 'POST', token, body: f })
    console.log(`✓ tạo field: briefs.${f.field}`)
  }

  console.log('\n✅ Xong. Chạy tiếp để Public được ghi field mới:')
  console.log('   node --env-file=.env directus/setup-permissions.mjs')
}

main().catch((err) => {
  console.error('\n❌ Lỗi:', err.message)
  process.exit(1)
})
