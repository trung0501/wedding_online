// ============================================================
//  P1 (còn nợ) — SIẾT quyền Public role theo mục 6 tài liệu thiết kế.
//
//  ⚠️  Script này CÓ GHI vào Directus. Trước khi ghi nó tự sao lưu
//     toàn bộ cấu hình hiện tại ra directus/permissions-backup-<ngày>.json
//
//  CHẠY (Directus đang chạy, từ thư mục gốc):
//    node --env-file=.env directus/setup-permissions.mjs --dry-run   # xem trước, KHÔNG ghi
//    node --env-file=.env directus/setup-permissions.mjs             # áp dụng thật
//    node --env-file=.env directus/setup-permissions.mjs --restore   # quay lui bản mới nhất
//
//  Idempotent: chạy lại nhiều lần cho cùng một kết quả.
// ============================================================

import { writeFileSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const URL = (process.env.DIRECTUS_URL || process.env.PUBLIC_URL || 'http://localhost:8055').replace(/\/$/, '')
const EMAIL = process.env.ADMIN_EMAIL
const PASSWORD = process.env.ADMIN_PASSWORD
const DIR = 'directus'

const DRY = process.argv.includes('--dry-run')
const RESTORE = process.argv.includes('--restore')
const PUBLIC_FOLDER_NAME = 'Public'

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

// ---------- Cấu hình đích (mục 6 tài liệu thiết kế) ----------

// Field renderer thực sự cần. Cố tình BỎ: owner (id nhân viên), date_created, date_updated.
const INVITATION_PUBLIC_FIELDS = [
  'id', 'template', 'status', 'published_at',
  'groom_name', 'groom_full_name', 'groom_father', 'groom_mother',
  'bride_name', 'bride_full_name', 'bride_father', 'bride_mother',
  'cover_photo', 'couple_photo', 'love_story', 'settings',
]

// Field khách được phép GHI. Cố tình BỎ: status, invitation (chỉ nhân viên đặt).
// `source` cho ghi được vì nó chỉ là nhãn thống kê, không phải cổng nghiệp vụ.
const BRIEF_CREATE_FIELDS = [
  'contact_name', 'contact_phone', 'contact_channel', 'contact_email', 'template',
  'groom_name', 'bride_name', 'event_info', 'wish', 'source',
]

// Thiệp cha phải ở trạng thái published.
const PUBLISHED_PARENT = { invitation: { status: { _eq: 'published' } } }

function desiredPermissions(publicFolderId) {
  return [
    // ----- Khách gửi thông tin (form intake) -----
    { collection: 'briefs', action: 'create', fields: BRIEF_CREATE_FIELDS, permissions: {} },
    { collection: 'brief_photos', action: 'create', fields: ['brief', 'image', 'sort'], permissions: {} },

    // ----- Khách mời tương tác -----
    { collection: 'rsvps', action: 'create', fields: ['invitation', 'guest', 'name', 'attending', 'num_guests', 'side', 'message'], permissions: {} },
    // presets: Directus tự gán status='approved' khi khách gửi. Không cho khách
    // ghi field `status` (dễ tự duyệt bài spam), mà cũng không phụ thuộc giá trị
    // mặc định của bảng — nếu default là 'pending' thì tường lời chúc sẽ trống trơn.
    {
      collection: 'guestbook',
      action: 'create',
      fields: ['invitation', 'guest', 'name', 'message'],
      permissions: {},
      presets: { status: 'approved' },
    },
    { collection: 'guestbook', action: 'read', fields: ['id', 'invitation', 'name', 'message', 'date_created'], permissions: { status: { _eq: 'approved' } } },

    // ----- Thư viện mẫu -----
    { collection: 'templates', action: 'read', fields: ['*'], permissions: { is_active: { _eq: true } } },
    { collection: 'template_categories', action: 'read', fields: ['*'], permissions: {} },

    // ----- Thiệp công khai -----
    { collection: 'invitations', action: 'read', fields: INVITATION_PUBLIC_FIELDS, permissions: { status: { _eq: 'published' } } },
    // Bốn bảng con: lọc theo trạng thái thiệp cha, nếu không thì che được thiệp draft
    // nhưng ruột của nó (địa chỉ tiệc, số tài khoản) vẫn đọc thẳng được.
    { collection: 'invitation_variants', action: 'read', fields: ['*'], permissions: PUBLISHED_PARENT },
    { collection: 'events', action: 'read', fields: ['*'], permissions: PUBLISHED_PARENT },
    { collection: 'photos', action: 'read', fields: ['*'], permissions: PUBLISHED_PARENT },
    { collection: 'gift_accounts', action: 'read', fields: ['*'], permissions: PUBLISHED_PARENT },

    // ----- Ảnh: chỉ file nằm trong folder Public -----
    {
      collection: 'directus_files',
      action: 'read',
      fields: ['id', 'filename_download', 'title', 'description', 'type', 'width', 'height'],
      permissions: publicFolderId ? { folder: { _eq: publicFolderId } } : {},
    },
  ]
}

const sameFilter = (a, b) => JSON.stringify(a ?? {}) === JSON.stringify(b ?? {})
const samePresets = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
const sameFields = (a, b) => JSON.stringify([...(a ?? [])].sort()) === JSON.stringify([...(b ?? [])].sort())

// ---------- Tìm policy Public ----------

async function getPublicPolicy(token) {
  const access = await api('/access?filter[role][_null]=true&filter[user][_null]=true&fields=id,policy&limit=-1', {
    token,
    allow404: true,
  })
  const ids = (access?.data ?? []).map((a) => (typeof a.policy === 'object' ? a.policy?.id : a.policy)).filter(Boolean)
  if (!ids.length) throw new Error('Không tìm thấy policy Public. Kiểm tra Settings → Access Policies trong admin.')
  if (ids.length > 1) console.log(`⚠️  Có ${ids.length} policy public, script dùng cái đầu tiên: ${ids[0]}`)
  return ids[0]
}

async function getPublicPerms(token, policyId) {
  const r = await api(`/permissions?filter[policy][_eq]=${policyId}&limit=-1&fields=*`, { token })
  return r?.data ?? []
}

// ---------- Sao lưu / khôi phục ----------

async function snapshot(token, policyId) {
  const perms = await getPublicPerms(token, policyId)
  const settings = await api('/settings?fields=storage_default_folder', { token, allow404: true })
  return {
    savedAt: new Date().toISOString(),
    url: URL,
    policyId,
    storage_default_folder: settings?.data?.storage_default_folder ?? null,
    permissions: perms,
  }
}

function backupPath() {
  const d = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return join(DIR, `permissions-backup-${d}.json`)
}

async function restore(token) {
  const files = readdirSync(DIR).filter((f) => f.startsWith('permissions-backup-')).sort()
  if (!files.length) throw new Error(`Không tìm thấy file sao lưu nào trong ${DIR}/`)
  const file = join(DIR, files[files.length - 1])
  const snap = JSON.parse(readFileSync(file, 'utf8'))
  console.log(`▶ Khôi phục từ: ${file}  (lưu lúc ${snap.savedAt})`)

  const current = await getPublicPerms(token, snap.policyId)
  for (const p of current) await api(`/permissions/${p.id}`, { method: 'DELETE', token })
  console.log(`  · đã xoá ${current.length} quyền hiện tại`)

  for (const p of snap.permissions) {
    const { id, ...body } = p
    await api('/permissions', { method: 'POST', token, body })
  }
  console.log(`  · đã phục hồi ${snap.permissions.length} quyền`)

  if (snap.storage_default_folder !== undefined) {
    await api('/settings', { method: 'PATCH', token, body: { storage_default_folder: snap.storage_default_folder } })
    console.log('  · đã phục hồi folder upload mặc định')
  }
  console.log('\n✅ Khôi phục xong.')
}

// ---------- Folder Public ----------

async function ensurePublicFolder(token) {
  const found = await api(`/folders?filter[name][_eq]=${encodeURIComponent(PUBLIC_FOLDER_NAME)}&limit=1`, { token, allow404: true })
  if (found?.data?.length) {
    console.log(`• folder "${PUBLIC_FOLDER_NAME}" đã có: ${found.data[0].id}`)
    return found.data[0].id
  }
  if (DRY) {
    // Trả id giả để phần xem trước vẫn hiện được filter folder sẽ áp lên directus_files.
    console.log(`  [dry-run] sẽ tạo folder "${PUBLIC_FOLDER_NAME}"`)
    return '<id-folder-se-tao>'
  }
  const r = await api('/folders', { method: 'POST', token, body: { name: PUBLIC_FOLDER_NAME } })
  console.log(`✓ tạo folder "${PUBLIC_FOLDER_NAME}": ${r.data.id}`)
  return r.data.id
}

// File cũ có folder = null → sau khi bật filter sẽ 403. Phải chuyển vào Public.
async function moveOrphanFiles(token, folderId) {
  const r = await api('/files?filter[folder][_null]=true&fields=id&limit=-1', { token })
  const ids = (r?.data ?? []).map((f) => f.id)
  if (!ids.length) {
    console.log('• không có file nào ngoài folder — bỏ qua')
    return 0
  }
  if (DRY) {
    console.log(`  [dry-run] sẽ chuyển ${ids.length} file đang ở ngoài vào folder Public`)
    return ids.length
  }
  await api('/files', { method: 'PATCH', token, body: { keys: ids, data: { folder: folderId } } })
  console.log(`✓ chuyển ${ids.length} file vào folder Public`)
  return ids.length
}

async function setDefaultUploadFolder(token, folderId) {
  const fields = await api('/fields/directus_settings', { token, allow404: true })
  const has = (fields?.data ?? []).some((f) => f.field === 'storage_default_folder')
  if (!has) {
    console.log('⚠️  Bản Directus này không có storage_default_folder — hãy đặt folder mặc định bằng tay trong Settings → Files')
    return
  }
  if (DRY) {
    console.log('  [dry-run] sẽ đặt Public làm folder upload mặc định')
    return
  }
  await api('/settings', { method: 'PATCH', token, body: { storage_default_folder: folderId } })
  console.log('✓ đặt Public làm folder upload mặc định')
}

// ---------- Áp dụng quyền ----------

async function applyPermissions(token, policyId, desired) {
  const current = await getPublicPerms(token, policyId)
  const key = (c, a) => `${c}.${a}`
  const byKey = new Map(current.map((p) => [key(p.collection, p.action), p]))
  const wanted = new Set(desired.map((d) => key(d.collection, d.action)))

  let added = 0, updated = 0, removed = 0, unchanged = 0

  for (const d of desired) {
    const k = key(d.collection, d.action)
    const existing = byKey.get(k)
    const body = { policy: policyId, collection: d.collection, action: d.action, fields: d.fields, permissions: d.permissions, validation: {}, presets: d.presets ?? null }

    if (!existing) {
      console.log(`  + THÊM   ${k}`)
      if (!DRY) await api('/permissions', { method: 'POST', token, body })
      added++
    } else if (
      !sameFields(existing.fields, d.fields) ||
      !sameFilter(existing.permissions, d.permissions) ||
      !samePresets(existing.presets, d.presets ?? null)
    ) {
      console.log(`  ~ SỬA    ${k}`)
      if (!sameFilter(existing.permissions, d.permissions)) {
        console.log(`            filter: ${JSON.stringify(existing.permissions ?? {})} → ${JSON.stringify(d.permissions)}`)
      }
      if (!sameFields(existing.fields, d.fields)) {
        console.log(`            field:  ${(existing.fields ?? []).join(',') || '(trống)'} → ${d.fields.join(',')}`)
      }
      if (!DRY) await api(`/permissions/${existing.id}`, { method: 'PATCH', token, body })
      updated++
    } else {
      unchanged++
    }
  }

  for (const p of current) {
    if (!wanted.has(key(p.collection, p.action))) {
      console.log(`  - GỠ     ${key(p.collection, p.action)}  (không nằm trong mục 6)`)
      if (!DRY) await api(`/permissions/${p.id}`, { method: 'DELETE', token })
      removed++
    }
  }

  return { added, updated, removed, unchanged }
}

// ---------- Main ----------

async function main() {
  console.log(`▶ Directus: ${URL}`)
  if (DRY) console.log('▶ CHẾ ĐỘ XEM TRƯỚC — không ghi gì vào Directus\n')

  const token = await getToken()

  if (RESTORE) return restore(token)

  const policyId = await getPublicPolicy(token)
  console.log(`▶ Policy Public: ${policyId}\n`)

  // 1. Sao lưu
  const snap = await snapshot(token, policyId)
  if (!DRY) {
    const p = backupPath()
    writeFileSync(p, JSON.stringify(snap, null, 2), 'utf8')
    console.log(`💾 Đã sao lưu ${snap.permissions.length} quyền → ${p}`)
    console.log('   Quay lui bất cứ lúc nào: node --env-file=.env directus/setup-permissions.mjs --restore\n')
  }

  // 2. Folder Public + chuyển file + folder mặc định
  console.log('── Ảnh (directus_files) ──')
  const folderId = await ensurePublicFolder(token)
  if (folderId) {
    await moveOrphanFiles(token, folderId)
    await setDefaultUploadFolder(token, folderId)
  }

  // 3. Quyền
  console.log('\n── Quyền Public ──')
  const stats = await applyPermissions(token, policyId, desiredPermissions(folderId))
  if (stats.added + stats.updated + stats.removed === 0) console.log('  (không có gì thay đổi)')

  console.log(`\n▶ Thêm ${stats.added} · Sửa ${stats.updated} · Gỡ ${stats.removed} · Giữ nguyên ${stats.unchanged}`)

  if (DRY) {
    console.log('\n▶ Đây mới chỉ là xem trước. Bỏ --dry-run để áp dụng thật.\n')
    return
  }

  console.log('\n✅ Xong. Kiểm tra lại bằng: node --env-file=.env directus/audit-permissions.mjs')
  console.log('\n📋 Nghiệm thu — thử đủ 5 luồng public:')
  console.log('   1. Mở /                     → thư viện hiện đủ 6 mẫu, có ảnh preview')
  console.log('   2. Mở /mau/hong-pastel-01   → xem trước mẫu bình thường')
  console.log('   3. Gửi form /dat-thiep      → brief mới xuất hiện trong admin')
  console.log('   4. Mở thiệp published       → hiện đủ nội dung VÀ ẢNH')
  console.log('   5. Gửi RSVP trên thiệp đó   → bản ghi mới trong rsvps')
  console.log('\n   Nếu có bước nào hỏng: node --env-file=.env directus/setup-permissions.mjs --restore\n')
}

main().catch((err) => {
  console.error('\n❌ Lỗi:', err.message)
  process.exit(1)
})
