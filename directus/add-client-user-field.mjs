// ============================================================
//  Thêm field `client_user` vào collection `invitations`.
//
//  Đây là sợi dây duy nhất nối một tài khoản khách hàng với thiệp của họ.
//  Toàn bộ phân quyền "Chủ thiệp" dựa vào field này:
//      { client_user: { _eq: '$CURRENT_USER' } }
//  Sai field này là hoặc khách không xem được gì, hoặc xem được thiệp
//  của người khác — nên nó phải đúng ngay từ đầu.
//
//  CHẠY (Directus đang chạy, từ thư mục gốc):
//    node --env-file=.env directus/add-client-user-field.mjs
//
//  Idempotent: field đã có thì bỏ qua.
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

async function main() {
  console.log(`▶ Directus: ${URL}`)
  const token = await getToken()

  const fields = (await api('/fields/invitations', { token })).data.map((f) => f.field)

  if (fields.includes('client_user')) {
    console.log('• field đã có: invitations.client_user')
  } else {
    await api('/fields/invitations', {
      method: 'POST',
      token,
      body: {
        field: 'client_user',
        type: 'uuid',
        meta: {
          interface: 'select-dropdown-m2o',
          special: ['m2o'],
          options: { template: '{{first_name}} {{last_name}} ({{email}})' },
          note: 'Tài khoản khách hàng được xem trang theo dõi khách mời của thiệp này',
          width: 'half',
        },
        schema: { is_nullable: true },
      },
    })
    console.log('✓ tạo field: invitations.client_user')
  }

  // Quan hệ M2O → directus_users. Tạo field kiểu uuid thôi chưa đủ,
  // phải khai báo relation thì Directus mới hiểu đây là khoá ngoại.
  const rel = await api('/relations/invitations/client_user', { token, allow404: true })
  if (rel) {
    console.log('• quan hệ đã có: invitations.client_user → directus_users')
  } else {
    await api('/relations', {
      method: 'POST',
      token,
      body: {
        collection: 'invitations',
        field: 'client_user',
        related_collection: 'directus_users',
        // Xoá tài khoản khách thì thiệp vẫn còn, chỉ mất liên kết.
        schema: { on_delete: 'SET NULL' },
        meta: { sort_field: null },
      },
    })
    console.log('✓ tạo quan hệ: invitations.client_user → directus_users')
  }

  console.log('\n✅ Xong. Bước tiếp theo:')
  console.log('   node --env-file=.env directus/setup-client-role.mjs')
}

main().catch((err) => {
  console.error('\n❌ Lỗi:', err.message)
  process.exit(1)
})
