// ============================================================
//  Dựng role + policy "Chủ thiệp" — tài khoản cho cặp đôi khách hàng.
//
//  Tài khoản này CHỈ ĐỌC, và chỉ đọc được đúng thiệp của chính mình:
//      invitations.client_user = người đang đăng nhập
//
//  Ba lời hứa với khách phải đúng bằng cấu hình dưới đây:
//    1. "Chỉ xem được thiệp của mình"  → mọi quyền read đều có bộ lọc
//    2. "Không sửa hay xoá được gì"    → không cấp create/update/delete
//                                        trên bất kỳ bảng dữ liệu nào
//    3. "Đổi được mật khẩu"            → update directus_users, GIỚI HẠN
//                                        bản ghi của chính họ và đúng 3 field
//
//  CHẠY (Directus đang chạy, từ thư mục gốc):
//    node --env-file=.env directus/setup-client-role.mjs --dry-run
//    node --env-file=.env directus/setup-client-role.mjs
//
//  Idempotent. PHẢI chạy sau add-client-user-field.mjs.
// ============================================================

const URL = (process.env.DIRECTUS_URL || process.env.PUBLIC_URL || 'http://localhost:8055').replace(/\/$/, '')
const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD
const DRY = process.argv.includes('--dry-run')

const ROLE_NAME = 'Chủ thiệp'
const POLICY_NAME = 'Chủ thiệp'

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

// ---------- Cấu hình quyền ----------

// Thiệp của chính mình.
const MINE = { client_user: { _eq: '$CURRENT_USER' } }
// Bảng con: lần theo thiệp cha rồi mới so chủ sở hữu.
const MINE_VIA_INVITATION = { invitation: { client_user: { _eq: '$CURRENT_USER' } } }
// Bản ghi tài khoản của chính mình.
const ME = { id: { _eq: '$CURRENT_USER' } }

const PERMISSIONS = [
  // ----- Thiệp của mình -----
  {
    collection: 'invitations',
    action: 'read',
    fields: [
      'id', 'status', 'published_at', 'template',
      'groom_name', 'groom_full_name', 'bride_name', 'bride_full_name',
      'cover_photo', 'love_story',
    ],
    permissions: MINE,
  },
  { collection: 'invitation_variants', action: 'read', fields: ['id', 'variant_type', 'slug'], permissions: MINE_VIA_INVITATION },
  { collection: 'events', action: 'read', fields: ['*'], permissions: MINE_VIA_INVITATION },

  // ----- Dữ liệu khách mời — lý do tồn tại của tài khoản này -----
  {
    collection: 'rsvps',
    action: 'read',
    fields: ['id', 'name', 'attending', 'num_guests', 'side', 'message', 'date_created'],
    permissions: MINE_VIA_INVITATION,
  },
  {
    collection: 'guestbook',
    action: 'read',
    fields: ['id', 'name', 'message', 'status', 'date_created'],
    permissions: MINE_VIA_INVITATION,
  },

  // ----- Tài khoản của chính mình -----
  {
    collection: 'directus_users',
    action: 'read',
    fields: ['id', 'first_name', 'last_name', 'email'],
    permissions: ME,
  },
  {
    collection: 'directus_users',
    action: 'update',
    // CHỈ 3 field. Tuyệt đối không cho `email` (chiếm chỗ tài khoản khác),
    // không cho `role`/`policies`/`status` (tự nâng quyền lên admin).
    fields: ['password', 'first_name', 'last_name'],
    permissions: ME,
  },
]

const sameFilter = (a, b) => JSON.stringify(a ?? {}) === JSON.stringify(b ?? {})
const sameFields = (a, b) => JSON.stringify([...(a ?? [])].sort()) === JSON.stringify([...(b ?? [])].sort())

// ---------- Chạy ----------

async function ensureRole(token) {
  const found = await api(`/roles?filter[name][_eq]=${encodeURIComponent(ROLE_NAME)}&limit=1`, { token })
  if (found.data?.length) {
    console.log(`• role đã có: "${ROLE_NAME}" (${found.data[0].id})`)
    return found.data[0].id
  }
  if (DRY) {
    console.log(`  [dry-run] sẽ tạo role "${ROLE_NAME}"`)
    return '<role-se-tao>'
  }
  const r = await api('/roles', {
    method: 'POST',
    token,
    body: { name: ROLE_NAME, icon: 'favorite', description: 'Cặp đôi khách hàng — chỉ xem dữ liệu thiệp của chính mình' },
  })
  console.log(`✓ tạo role "${ROLE_NAME}": ${r.data.id}`)
  return r.data.id
}

async function ensurePolicy(token) {
  const found = await api(`/policies?filter[name][_eq]=${encodeURIComponent(POLICY_NAME)}&limit=1`, { token })
  if (found.data?.length) {
    console.log(`• policy đã có: "${POLICY_NAME}" (${found.data[0].id})`)
    return found.data[0].id
  }
  if (DRY) {
    console.log(`  [dry-run] sẽ tạo policy "${POLICY_NAME}"`)
    return '<policy-se-tao>'
  }
  const r = await api('/policies', {
    method: 'POST',
    token,
    body: {
      name: POLICY_NAME,
      icon: 'favorite',
      description: 'Chỉ đọc thiệp, RSVP và lời chúc của chính mình',
      admin_access: false,
      // false = KHÔNG vào được giao diện admin Directus.
      // Khách vẫn đăng nhập qua API để dùng trang /quan-ly của mình.
      app_access: false,
      enforce_tfa: false,
    },
  })
  console.log(`✓ tạo policy "${POLICY_NAME}": ${r.data.id}`)
  return r.data.id
}

async function ensureAccess(token, roleId, policyId) {
  const found = await api(`/access?filter[role][_eq]=${roleId}&filter[policy][_eq]=${policyId}&limit=1`, {
    token,
    allow404: true,
  })
  if (found?.data?.length) {
    console.log('• role đã được gắn policy')
    return
  }
  if (DRY) {
    console.log('  [dry-run] sẽ gắn policy vào role')
    return
  }
  await api('/access', { method: 'POST', token, body: { role: roleId, policy: policyId, user: null } })
  console.log('✓ gắn policy vào role')
}

async function applyPermissions(token, policyId) {
  const current = DRY
    ? []
    : (await api(`/permissions?filter[policy][_eq]=${policyId}&limit=-1&fields=*`, { token }))?.data ?? []

  const key = (c, a) => `${c}.${a}`
  const byKey = new Map(current.map((p) => [key(p.collection, p.action), p]))
  const wanted = new Set(PERMISSIONS.map((d) => key(d.collection, d.action)))
  let added = 0, updated = 0, removed = 0, same = 0

  for (const d of PERMISSIONS) {
    const k = key(d.collection, d.action)
    const existing = byKey.get(k)
    const body = {
      policy: policyId,
      collection: d.collection,
      action: d.action,
      fields: d.fields,
      permissions: d.permissions,
      validation: {},
      presets: null,
    }
    if (!existing) {
      console.log(`  + THÊM   ${k}`)
      if (!DRY) await api('/permissions', { method: 'POST', token, body })
      added++
    } else if (!sameFields(existing.fields, d.fields) || !sameFilter(existing.permissions, d.permissions)) {
      console.log(`  ~ SỬA    ${k}`)
      if (!DRY) await api(`/permissions/${existing.id}`, { method: 'PATCH', token, body })
      updated++
    } else same++
  }

  for (const p of current) {
    if (!wanted.has(key(p.collection, p.action))) {
      console.log(`  - GỠ     ${key(p.collection, p.action)}  (không nằm trong danh sách)`)
      if (!DRY) await api(`/permissions/${p.id}`, { method: 'DELETE', token })
      removed++
    }
  }
  return { added, updated, removed, same }
}

async function main() {
  console.log(`▶ Directus: ${URL}`)
  if (DRY) console.log('▶ CHẾ ĐỘ XEM TRƯỚC — không ghi gì\n')
  const token = await getToken()

  // Chặn sớm: thiếu client_user thì mọi bộ lọc bên dưới đều vô nghĩa.
  const invFields = (await api('/fields/invitations', { token })).data.map((f) => f.field)
  if (!invFields.includes('client_user')) {
    throw new Error('Chưa có field invitations.client_user.\n   Chạy trước: node --env-file=.env directus/add-client-user-field.mjs')
  }

  console.log('── Role & Policy ──')
  const roleId = await ensureRole(token)
  const policyId = await ensurePolicy(token)
  await ensureAccess(token, roleId, policyId)

  console.log('\n── Quyền ──')
  const s = await applyPermissions(token, policyId)
  if (s.added + s.updated + s.removed === 0) console.log('  (không có gì thay đổi)')
  console.log(`\n▶ Thêm ${s.added} · Sửa ${s.updated} · Gỡ ${s.removed} · Giữ nguyên ${s.same}`)

  if (DRY) {
    console.log('\n▶ Mới chỉ xem trước. Bỏ --dry-run để áp dụng thật.\n')
    return
  }

  console.log('\n✅ Xong. Tạo tài khoản cho khách:')
  console.log('   node --env-file=.env directus/create-client-account.mjs --slug=<slug> --email=<email>\n')
}

main().catch((err) => {
  console.error('\n❌ Lỗi:', err.message)
  process.exit(1)
})
