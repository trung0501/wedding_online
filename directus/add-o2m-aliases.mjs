// ============================================================
//  P5 — Thêm alias O2M để admin gom quan hệ con vào trang cha.
//  Sau khi chạy, mở 1 invitation trong admin sẽ thấy tab:
//  Sự kiện / Ảnh / Khách / Mừng cưới / Link ngay bên trong.
//
//  CHẠY (Directus đang chạy):
//    node --env-file=.env directus/add-o2m-aliases.mjs
//
//  Idempotent: field đã có thì bỏ qua tạo, vẫn set lại one_field.
// ============================================================

const URL = (process.env.DIRECTUS_URL || process.env.PUBLIC_URL || 'http://localhost:8055').replace(/\/$/, '')
const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD

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
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${data?.errors?.[0]?.message || res.statusText}`)
  return data
}

async function getToken() {
  if (process.env.DIRECTUS_TOKEN) return process.env.DIRECTUS_TOKEN
  if (!EMAIL || !PASSWORD) throw new Error('Thiếu ADMIN_EMAIL/ADMIN_PASSWORD. Chạy kèm --env-file=.env')
  const r = await api('/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })
  return r.data.access_token
}

// [aliasName, parentCollection, childCollection, fkField]
const ALIASES = [
  ['events', 'invitations', 'events', 'invitation'],
  ['photos', 'invitations', 'photos', 'invitation'],
  ['guests', 'invitations', 'guests', 'invitation'],
  ['gift_accounts', 'invitations', 'gift_accounts', 'invitation'],
  ['variants', 'invitations', 'invitation_variants', 'invitation'],
  ['photos', 'briefs', 'brief_photos', 'brief'],
]

async function main() {
  console.log(`▶ Directus: ${URL}`)
  const token = await getToken()

  // Cache danh sách field theo collection để kiểm tra tồn tại (tránh 403 khi hỏi field chưa có).
  const fieldsCache = {}
  const fieldsOf = async (collection) => {
    if (!fieldsCache[collection]) {
      const res = await api(`/fields/${collection}`, { token })
      fieldsCache[collection] = res.data.map((f) => f.field)
    }
    return fieldsCache[collection]
  }

  for (const [alias, parent, child, fk] of ALIASES) {
    // 1) Tạo alias field (nếu chưa có)
    const exists = (await fieldsOf(parent)).includes(alias)
    if (exists) {
      console.log(`• field đã có: ${parent}.${alias}`)
    } else {
      await api(`/fields/${parent}`, {
        method: 'POST',
        token,
        body: {
          field: alias,
          type: 'alias',
          meta: { interface: 'list-o2m', special: ['o2m'], options: { enableCreate: true, enableSelect: true } },
        },
      })
      console.log(`✓ tạo alias O2M: ${parent}.${alias}`)
    }

    // 2) Gắn one_field vào relation con → cha
    await api(`/relations/${child}/${fk}`, { method: 'PATCH', token, body: { meta: { one_field: alias } } })
    console.log(`✓ liên kết: ${child}.${fk} → ${parent}.${alias}`)
  }

  console.log('\n✅ Hoàn tất. Mở lại admin, vào 1 Invitation sẽ thấy các tab quan hệ con.')
}

main().catch((err) => {
  console.error('\n❌ Lỗi:', err.message)
  process.exit(1)
})
