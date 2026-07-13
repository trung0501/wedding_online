// ============================================================
//  P1 — Bootstrap schema Directus cho nền tảng thiệp cưới
//  Tạo 11 collections + fields + relations theo tài liệu thiết kế.
//
//  CHẠY (từ thư mục gốc repo, Directus phải đang chạy):
//    node --env-file=.env directus/bootstrap-schema.mjs
//
//  - Idempotent: chạy lại nhiều lần an toàn (bỏ qua thứ đã tồn tại).
//  - Xác thực: dùng DIRECTUS_TOKEN nếu có, không thì đăng nhập bằng
//    ADMIN_EMAIL / ADMIN_PASSWORD (lấy từ .env).
// ============================================================

const URL = (process.env.DIRECTUS_URL || process.env.PUBLIC_URL || 'http://localhost:8055').replace(/\/$/, '')
const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD

// ---------- HTTP helper ----------
async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(URL + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const raw = await res.text()
  let data
  try {
    data = raw ? JSON.parse(raw) : null
  } catch {
    data = raw
  }
  if (!res.ok) {
    const msg = data?.errors?.[0]?.message || res.statusText
    throw new Error(`${method} ${path} → ${res.status}: ${msg}`)
  }
  return data
}

async function getToken() {
  if (process.env.DIRECTUS_TOKEN) return process.env.DIRECTUS_TOKEN
  if (!EMAIL || !PASSWORD) {
    throw new Error('Thiếu ADMIN_EMAIL/ADMIN_PASSWORD (hoặc DIRECTUS_TOKEN). Chạy kèm --env-file=.env')
  }
  const r = await api('/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } })
  return r.data.access_token
}

// ---------- Field builders ----------
const field = (f, type, { meta = {}, schema = {} } = {}) => ({ field: f, type, meta, schema })

const pk = () =>
  field('id', 'uuid', {
    meta: { hidden: true, readonly: true, interface: 'input', special: ['uuid'] },
    schema: { is_primary_key: true, has_auto_increment: false },
  })

const str = (f, o = {}) =>
  field(f, 'string', {
    meta: { interface: 'input', required: !!o.required },
    schema: {
      ...(o.unique && { is_unique: true }),
      ...(o.default !== undefined && { default_value: o.default }),
      ...(o.required && { is_nullable: false }),
    },
  })

const text = (f) => field(f, 'text', { meta: { interface: 'input-multiline' } })
const int = (f, d) => field(f, 'integer', { meta: { interface: 'input' }, schema: { ...(d !== undefined && { default_value: d }) } })
const flt = (f) => field(f, 'float', { meta: { interface: 'input' } })
const bool = (f, d) => field(f, 'boolean', { meta: { interface: 'boolean' }, schema: { default_value: !!d } })
const json = (f) => field(f, 'json', { meta: { interface: 'input-code', options: { language: 'json' } } })
const ts = (f) => field(f, 'timestamp', { meta: { interface: 'datetime' } })
const createdAt = () =>
  field('date_created', 'timestamp', { meta: { special: ['date-created'], interface: 'datetime', readonly: true, hidden: true } })
const updatedAt = () =>
  field('date_updated', 'timestamp', { meta: { special: ['date-updated'], interface: 'datetime', readonly: true, hidden: true } })
const enom = (f, choices, d) =>
  field(f, 'string', {
    meta: { interface: 'select-dropdown', options: { choices: choices.map((c) => ({ text: c, value: c })) } },
    schema: { ...(d !== undefined && { default_value: d }) },
  })
// M2O: cột uuid + relation tạo sau. file=true dùng picker ảnh (tới directus_files).
const m2o = (f, { file = false } = {}) => field(f, 'uuid', { meta: { interface: file ? 'file-image' : 'select-dropdown-m2o' } })

// ---------- Spec collections (mục 5 tài liệu) ----------
const collections = [
  { collection: 'template_categories', meta: { icon: 'category', note: 'Nhóm phong cách thiệp' },
    fields: [pk(), str('name', { required: true }), str('slug', { unique: true }), int('sort', 0)] },

  { collection: 'templates', meta: { icon: 'style', note: 'Mẫu thiệp' },
    fields: [pk(), str('name', { required: true }), str('slug', { unique: true }), text('description'),
      m2o('category'), m2o('thumbnail', { file: true }), str('component_key'), json('style_tokens'),
      json('default_sections'), enom('badge', ['none', 'hot', 'new'], 'none'), bool('is_active', true),
      int('sort', 0), int('price', 0)] },

  { collection: 'briefs', meta: { icon: 'assignment', note: 'Form thu thập thông tin (intake) — mô hình B' },
    fields: [pk(), str('contact_name'), str('contact_phone'), str('contact_channel'), m2o('template'),
      str('groom_name'), str('bride_name'), text('event_info'), text('wish'),
      enom('status', ['new', 'in_progress', 'quoted', 'paid', 'delivered', 'canceled'], 'new'),
      m2o('invitation'), createdAt()] },

  { collection: 'brief_photos', meta: { icon: 'add_photo_alternate', note: 'Ảnh khách gửi kèm brief' },
    fields: [pk(), m2o('brief'), m2o('image', { file: true }), int('sort', 0)] },

  { collection: 'invitations', meta: { icon: 'favorite', note: 'Thiệp cưới (bảng lõi)' },
    fields: [pk(), m2o('owner'), m2o('template'), enom('status', ['draft', 'review', 'approved', 'published', 'archived'], 'draft'),
      str('groom_name'), str('groom_full_name'), str('groom_father'), str('groom_mother'),
      str('bride_name'), str('bride_full_name'), str('bride_father'), str('bride_mother'),
      m2o('cover_photo', { file: true }), m2o('couple_photo', { file: true }), text('love_story'),
      json('settings'), ts('published_at'), createdAt(), updatedAt()] },

  { collection: 'invitation_variants', meta: { icon: 'link', note: '3 biến thể link (chung/nhà trai/nhà gái)' },
    fields: [pk(), m2o('invitation'), enom('variant_type', ['combined', 'groom', 'bride']),
      str('slug', { unique: true }), json('display_config')] },

  { collection: 'events', meta: { icon: 'event', note: 'Mốc lễ / tiệc' },
    fields: [pk(), m2o('invitation'), enom('event_type', ['le_vu_quy', 'le_tan_hon', 'le_thanh_hon', 'tiec_cuoi']),
      str('title'), ts('event_at'), str('venue_name'), text('address'), flt('map_lat'), flt('map_lng'),
      str('map_url'), enom('side', ['groom', 'bride', 'both'], 'both'), int('sort', 0)] },

  { collection: 'photos', meta: { icon: 'photo_library', note: 'Album ảnh' },
    fields: [pk(), m2o('invitation'), m2o('image', { file: true }), str('caption'), int('sort', 0)] },

  { collection: 'guests', meta: { icon: 'group', note: 'Khách mời (cá nhân hóa)' },
    fields: [pk(), m2o('invitation'), str('name'), str('salutation'), enom('side', ['groom', 'bride', 'both'], 'both'),
      str('tag'), str('token', { unique: true }), str('phone'), text('note')] },

  { collection: 'rsvps', meta: { icon: 'how_to_reg', note: 'Xác nhận tham dự' },
    fields: [pk(), m2o('invitation'), m2o('guest'), str('name'), enom('attending', ['yes', 'no', 'maybe']),
      int('num_guests', 1), enom('side', ['groom', 'bride']), text('message'), createdAt()] },

  { collection: 'guestbook', meta: { icon: 'edit_note', note: 'Lưu bút / lời chúc' },
    fields: [pk(), m2o('invitation'), m2o('guest'), str('name'), text('message'),
      enom('status', ['pending', 'approved'], 'approved'), createdAt()] },

  { collection: 'gift_accounts', meta: { icon: 'redeem', note: 'Mừng cưới QR' },
    fields: [pk(), m2o('invitation'), enom('side', ['groom', 'bride']), str('bank_name'),
      str('account_number'), str('account_holder'), m2o('qr_image', { file: true })] },

  { collection: 'orders', meta: { icon: 'payments', note: 'Theo dõi thu tiền thủ công (mô hình B)' },
    fields: [pk(), m2o('invitation'), m2o('brief'), int('amount'), enom('status', ['pending', 'paid', 'canceled'], 'pending'),
      str('method'), ts('paid_at'), text('note'), createdAt()] },

  { collection: 'invitation_views', meta: { icon: 'visibility', note: 'Analytics lượt xem (tùy chọn)' },
    fields: [pk(), m2o('invitation'), m2o('variant'), m2o('guest'), createdAt(), str('user_agent')] },
]

// ---------- Relations: [collection, field, related_collection, on_delete] ----------
const relations = [
  ['templates', 'category', 'template_categories', 'SET NULL'],
  ['templates', 'thumbnail', 'directus_files', 'SET NULL'],
  ['briefs', 'template', 'templates', 'SET NULL'],
  ['briefs', 'invitation', 'invitations', 'SET NULL'],
  ['brief_photos', 'brief', 'briefs', 'CASCADE'],
  ['brief_photos', 'image', 'directus_files', 'SET NULL'],
  ['orders', 'invitation', 'invitations', 'SET NULL'],
  ['orders', 'brief', 'briefs', 'SET NULL'],
  ['invitations', 'owner', 'directus_users', 'SET NULL'],
  ['invitations', 'template', 'templates', 'SET NULL'],
  ['invitations', 'cover_photo', 'directus_files', 'SET NULL'],
  ['invitations', 'couple_photo', 'directus_files', 'SET NULL'],
  ['invitation_variants', 'invitation', 'invitations', 'CASCADE'],
  ['events', 'invitation', 'invitations', 'CASCADE'],
  ['photos', 'invitation', 'invitations', 'CASCADE'],
  ['photos', 'image', 'directus_files', 'SET NULL'],
  ['guests', 'invitation', 'invitations', 'CASCADE'],
  ['rsvps', 'invitation', 'invitations', 'CASCADE'],
  ['rsvps', 'guest', 'guests', 'SET NULL'],
  ['guestbook', 'invitation', 'invitations', 'CASCADE'],
  ['guestbook', 'guest', 'guests', 'SET NULL'],
  ['gift_accounts', 'invitation', 'invitations', 'CASCADE'],
  ['gift_accounts', 'qr_image', 'directus_files', 'SET NULL'],
  ['invitation_views', 'invitation', 'invitations', 'CASCADE'],
  ['invitation_views', 'variant', 'invitation_variants', 'CASCADE'],
  ['invitation_views', 'guest', 'guests', 'SET NULL'],
]

// ---------- Main ----------
async function main() {
  console.log(`▶ Directus: ${URL}`)
  const token = await getToken()
  console.log('✓ Đã xác thực')

  const existingCols = new Set((await api('/collections', { token })).data.map((c) => c.collection))
  for (const c of collections) {
    if (existingCols.has(c.collection)) {
      console.log(`• bỏ qua collection (đã có): ${c.collection}`)
      continue
    }
    await api('/collections', { method: 'POST', token, body: { collection: c.collection, meta: c.meta, schema: {}, fields: c.fields } })
    console.log(`✓ tạo collection: ${c.collection} (${c.fields.length} field)`)
  }

  const existingRels = new Set((await api('/relations', { token })).data.map((r) => `${r.collection}.${r.field}`))
  for (const [collection, field, related, onDelete] of relations) {
    const key = `${collection}.${field}`
    if (existingRels.has(key)) {
      console.log(`• bỏ qua relation (đã có): ${key}`)
      continue
    }
    await api('/relations', {
      method: 'POST',
      token,
      body: { collection, field, related_collection: related, meta: { sort_field: null }, schema: { on_delete: onDelete } },
    })
    console.log(`✓ tạo relation: ${key} → ${related} (on delete ${onDelete})`)
  }

  console.log('\n✅ Hoàn tất P1 — schema đã sẵn sàng.')
}

main().catch((err) => {
  console.error('\n❌ Lỗi:', err.message)
  process.exit(1)
})
