// ============================================================
//  Seed danh mục MẪU THIỆP vào Directus (idempotent theo slug).
//  Thêm/bổ sung các mẫu để hiện trong trang thư viện mẫu.
//
//  CHẠY (Directus đang chạy):
//    node --env-file=.env directus/seed-templates.mjs
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

// component_key phải khớp registry.ts ở frontend.
const TEMPLATES = [
  { name: 'Hồng Pastel 01', slug: 'hong-pastel-01', component_key: 'hong-pastel-01', badge: 'new', sort: 1, description: 'Tông hồng pastel lãng mạn, nữ tính, ngọt ngào.' },
  { name: 'Đỏ Truyền Thống 01', slug: 'do-truyen-thong-01', component_key: 'do-truyen-thong-01', badge: 'hot', sort: 2, description: 'Sắc đỏ son Á Đông, chữ Hỷ, trang trọng cổ điển.' },
  { name: 'Xanh Thiên Nhiên 01', slug: 'xanh-thien-nhien-01', component_key: 'xanh-thien-nhien-01', badge: 'none', sort: 3, description: 'Xanh lá tươi mát, phong cách vườn cưới ngoài trời.' },
  { name: 'Kem Gold 01', slug: 'kem-gold-01', component_key: 'kem-gold-01', badge: 'new', sort: 4, description: 'Nền kem điểm vàng champagne, sang trọng hiện đại.' },
  { name: 'Tím Lavender 01', slug: 'tim-lavender-01', component_key: 'tim-lavender-01', badge: 'new', sort: 5, description: 'Tím oải hương dịu dàng, ảnh bìa nửa trang, dòng thời gian sự kiện.' },
  { name: 'Burgundy Vintage 01', slug: 'burgundy-vintage-01', component_key: 'burgundy-vintage-01', badge: 'none', sort: 6, description: 'Đỏ rượu vang trầm ấm, khung viền tối giản, hoài cổ tinh tế.' },
]

async function main() {
  console.log(`▶ Directus: ${URL}`)
  const token = await getToken()

  for (const t of TEMPLATES) {
    const existed = await api(`/items/templates?filter[slug][_eq]=${t.slug}&limit=1`, { token })
    if (existed.data?.length) {
      console.log(`• bỏ qua (đã có): ${t.slug}`)
      continue
    }
    await api('/items/templates', { method: 'POST', token, body: { ...t, is_active: true, price: 0 } })
    console.log(`✓ tạo template: ${t.slug}`)
  }

  console.log('\n✅ Seed template xong. Mở lại trang thư viện mẫu để xem.')
}

main().catch((err) => {
  console.error('\n❌ Lỗi:', err.message)
  process.exit(1)
})
