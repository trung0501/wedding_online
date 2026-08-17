// ============================================================
//  Tạo tài khoản "Chủ thiệp" cho khách hàng và gắn vào thiệp của họ.
//
//  CHẠY (Directus đang chạy, từ thư mục gốc):
//    node --env-file=.env directus/create-client-account.mjs \
//         --slug=phuc-hanh --email=phuchanh@gmail.com --name="Hồng Phúc & Hồng Hạnh"
//
//  Tuỳ chọn:
//    --password=...   đặt mật khẩu cụ thể (mặc định: sinh ngẫu nhiên)
//    --reset          tài khoản đã có → đặt lại mật khẩu mới
//    --dry-run        xem trước, không ghi
//
//  --slug là slug của MỘT invitation_variants thuộc thiệp cần gắn.
//  Chạy xong script in sẵn tin nhắn Zalo để copy gửi khách.
// ============================================================

import { randomBytes } from 'node:crypto'

const URL = (process.env.DIRECTUS_URL || process.env.PUBLIC_URL || 'http://localhost:8055').replace(/\/$/, '')
const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const SITE_URL = process.env.SITE_URL || 'http://localhost:5173'

const arg = (name) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : undefined
}
const has = (name) => process.argv.includes(`--${name}`)

const SLUG = arg('slug')
const CLIENT_EMAIL = arg('email')
const CLIENT_NAME = arg('name') || ''
const FORCE_PASSWORD = arg('password')
const RESET = has('reset')
const DRY = has('dry-run')

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
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw new Error('Thiếu ADMIN_EMAIL/ADMIN_PASSWORD. Chạy kèm --env-file=.env')
  const r = await api('/auth/login', { method: 'POST', body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } })
  return r.data.access_token
}

// Mật khẩu dễ đọc qua Zalo: bỏ các ký tự dễ nhìn nhầm (0/O, 1/l/I).
function genPassword() {
  const abc = 'abcdefghijkmnpqrstuvwxyz'
  const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const num = '23456789'
  const pool = abc + ABC + num
  const bytes = randomBytes(14)
  let out = ''
  for (let i = 0; i < 12; i++) out += pool[bytes[i] % pool.length]
  // Bảo đảm có đủ 3 loại ký tự.
  return out.slice(0, 10) + ABC[bytes[12] % ABC.length] + num[bytes[13] % num.length]
}

function usage() {
  console.error(`
Thiếu tham số. Ví dụ:

  node --env-file=.env directus/create-client-account.mjs \\
       --slug=phuc-hanh --email=phuchanh@gmail.com --name="Hồng Phúc & Hồng Hạnh"
`)
  process.exit(1)
}

async function main() {
  if (!SLUG || !CLIENT_EMAIL) usage()

  console.log(`▶ Directus: ${URL}`)
  if (DRY) console.log('▶ CHẾ ĐỘ XEM TRƯỚC — không ghi gì\n')
  const token = await getToken()

  // 1. Tìm thiệp qua slug của variant
  const variants = await api(`/items/invitation_variants?filter[slug][_eq]=${encodeURIComponent(SLUG)}&limit=1&fields=id,invitation`, { token })
  const variant = variants.data?.[0]
  if (!variant?.invitation) throw new Error(`Không tìm thấy thiệp nào có slug "${SLUG}" trong invitation_variants.`)

  const invId = variant.invitation
  const inv = (await api(`/items/invitations/${invId}?fields=id,groom_name,bride_name,status,client_user`, { token })).data
  console.log(`▶ Thiệp: ${inv.groom_name} & ${inv.bride_name}  (trạng thái: ${inv.status})`)

  if (inv.status !== 'published') {
    console.log('⚠️  Thiệp chưa publish. Tài khoản vẫn tạo được, nhưng khách sẽ chưa thấy gì.')
  }

  // 2. Tìm role "Chủ thiệp"
  const roles = await api(`/roles?filter[name][_eq]=${encodeURIComponent('Chủ thiệp')}&limit=1`, { token })
  const role = roles.data?.[0]
  if (!role) throw new Error('Chưa có role "Chủ thiệp".\n   Chạy trước: node --env-file=.env directus/setup-client-role.mjs')

  // 3. Tạo hoặc cập nhật tài khoản
  const existing = await api(`/users?filter[email][_eq]=${encodeURIComponent(CLIENT_EMAIL)}&limit=1&fields=id,email,role`, { token })
  const user = existing.data?.[0]
  const password = FORCE_PASSWORD || genPassword()
  let userId
  let passwordShown = password

  if (user) {
    userId = user.id
    if (RESET || FORCE_PASSWORD) {
      console.log(`• tài khoản đã có: ${CLIENT_EMAIL} → đặt lại mật khẩu`)
      if (!DRY) await api(`/users/${userId}`, { method: 'PATCH', token, body: { password, role: role.id } })
    } else {
      console.log(`• tài khoản đã có: ${CLIENT_EMAIL} (giữ nguyên mật khẩu — thêm --reset nếu muốn đổi)`)
      passwordShown = '(mật khẩu cũ, không đổi)'
    }
  } else {
    const [first, ...rest] = CLIENT_NAME.trim().split(/\s+/)
    if (DRY) {
      console.log(`  [dry-run] sẽ tạo tài khoản ${CLIENT_EMAIL}`)
      userId = '<user-se-tao>'
    } else {
      const r = await api('/users', {
        method: 'POST',
        token,
        body: {
          email: CLIENT_EMAIL,
          password,
          role: role.id,
          first_name: first || 'Khách',
          last_name: rest.join(' ') || '',
          status: 'active',
        },
      })
      userId = r.data.id
      console.log(`✓ tạo tài khoản: ${CLIENT_EMAIL}`)
    }
  }

  // 4. Gắn tài khoản vào thiệp
  if (inv.client_user === userId) {
    console.log('• thiệp đã gắn đúng tài khoản này')
  } else {
    if (inv.client_user) console.log(`⚠️  Thiệp đang gắn tài khoản khác (${inv.client_user}) — sẽ thay bằng tài khoản này`)
    if (!DRY) await api(`/items/invitations/${invId}`, { method: 'PATCH', token, body: { client_user: userId } })
    console.log('✓ gắn tài khoản vào thiệp')
  }

  if (DRY) {
    console.log('\n▶ Mới chỉ xem trước. Bỏ --dry-run để áp dụng thật.\n')
    return
  }

  // 5. In sẵn tin nhắn để copy gửi Zalo
  console.log('\n' + '═'.repeat(58))
  console.log('COPY ĐOẠN DƯỚI GỬI KHÁCH')
  console.log('═'.repeat(58))
  console.log(`
Thiệp cưới của anh chị đã hoàn thiện ạ:
${SITE_URL}/${SLUG}

Trang theo dõi khách mời (xem ai đã xác nhận, đọc lời chúc):
${SITE_URL}/quan-ly
Email:    ${CLIENT_EMAIL}
Mật khẩu: ${passwordShown}

Anh chị đổi mật khẩu ngay sau lần đăng nhập đầu tiên nhé.
`)
  console.log('═'.repeat(58))
  console.log('\n⚠️  Mật khẩu chỉ hiện MỘT LẦN ở đây. Gửi khách xong thì xoá khỏi lịch sử terminal.')
  console.log('   Quên thì chạy lại kèm --reset để đặt mật khẩu mới.\n')
}

main().catch((err) => {
  console.error('\n❌ Lỗi:', err.message)
  process.exit(1)
})
