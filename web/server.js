// ============================================================
//  Server phục vụ bản build + chèn thẻ Open Graph cho từng thiệp.
//
//  VÌ SAO CẦN: Zalo và Facebook KHÔNG chạy JavaScript. Chúng tải HTML thô
//  rồi đọc thẻ <meta>. App React chỉ có một index.html với tiêu đề cố định,
//  nội dung thiệp do JS dựng sau — con bot không bao giờ thấy. Kết quả là
//  dán link thiệp lên Zalo chỉ hiện "Thiệp Cưới Online", không ảnh, không tên.
//
//  Server này đọc dữ liệu thiệp từ Directus rồi chèn thẻ OG vào HTML
//  TRƯỚC KHI gửi đi. Trình duyệt thật vẫn nhận đúng app React như cũ.
//
//  KHÔNG DÙNG THƯ VIỆN NGOÀI. Chỉ cần phát file tĩnh và chèn vài thẻ meta —
//  express là thừa, mà thêm gói là thêm thứ phải vá lỗi bảo mật về sau.
//
//  CHẠY:
//    npm run build && npm start
//
//  BIẾN MÔI TRƯỜNG:
//    PORT                   cổng lắng nghe (mặc định 3000)
//    SITE_URL               domain công khai, dùng cho og:url
//    DIRECTUS_INTERNAL_URL  địa chỉ Directus phía server. Trên VPS nên dùng
//                           tên container (http://directus:8055) để đi mạng
//                           nội bộ, nhanh hơn và không tốn băng thông ngoài.
//    VITE_DIRECTUS_URL      địa chỉ Directus phía TRÌNH DUYỆT — ảnh OG phải
//                           dùng địa chỉ này, vì Zalo tải ảnh từ internet.
// ============================================================

import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync, createReadStream } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, normalize, extname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, 'dist')
const PORT = Number(process.env.PORT || 3000)

const SITE_URL = (process.env.SITE_URL || `http://localhost:${PORT}`).replace(/\/$/, '')
const PUBLIC_DIRECTUS = (process.env.VITE_DIRECTUS_URL || 'http://localhost:8055').replace(/\/$/, '')
const INTERNAL_DIRECTUS = (process.env.DIRECTUS_INTERNAL_URL || PUBLIC_DIRECTUS).replace(/\/$/, '')

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('❌ Chưa có thư mục dist. Chạy `npm run build` trước.')
  process.exit(1)
}
const TEMPLATE = readFileSync(join(DIST, 'index.html'), 'utf8')

// ---------- Tiện ích ----------

// Chèn vào thuộc tính HTML — bỏ qua là mở đường cho XSS, mà dữ liệu ở đây
// do khách hàng nhập nên không được tin.
const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

function cut(s, max) {
  const t = clean(s)
  return t.length <= max ? t : t.slice(0, max - 1).trimEnd() + '…'
}

const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
}

async function directus(path) {
  const res = await fetch(INTERNAL_DIRECTUS + path, { signal: AbortSignal.timeout(4000) })
  if (!res.ok) throw new Error(`Directus ${res.status}`)
  return res.json()
}

// ---------- Dựng thẻ meta ----------

function metaTags({ title, description, image, url, type = 'website', noindex = false }) {
  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:site_name" content="Thiệp Cưới Online" />`,
    `<meta property="og:locale" content="vi_VN" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
  ]
  if (image) {
    tags.push(
      `<meta property="og:image" content="${esc(image)}" />`,
      // Zalo và Facebook đọc hai thẻ này để dựng sẵn khung ảnh trước khi tải xong.
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta name="twitter:image" content="${esc(image)}" />`,
    )
  }
  if (noindex) tags.push(`<meta name="robots" content="noindex" />`)
  return tags.join('\n    ')
}

// index.html sẵn có <title>Thiệp Cưới Online</title> — phải gỡ đi,
// nếu không trang sẽ có hai thẻ title và bot đọc nhầm cái cũ.
const render = (meta) => TEMPLATE.replace(/<title>[\s\S]*?<\/title>/, '').replace('</head>', `  ${meta}\n  </head>`)

const ogImage = (fileId) =>
  fileId ? `${PUBLIC_DIRECTUS}/assets/${fileId}?width=1200&height=630&fit=cover&format=jpeg&quality=80` : ''

// ---------- Thẻ meta cho các trang tĩnh ----------

const STATIC_META = {
  '/': {
    title: 'Thiệp Cưới Online — Thiệp mời cưới điện tử thiết kế riêng',
    description:
      'Gửi lời mời trọn vẹn chỉ bằng một đường link. Thiệp thiết kế riêng theo câu chuyện của hai bạn, đẹp trên mọi màn hình, khách mời xác nhận tham dự ngay trên thiệp.',
  },
  '/kho-mau-thiep': {
    title: 'Kho mẫu thiệp cưới — Thiệp Cưới Online',
    description: 'Bộ sưu tập thiệp mời điện tử nhiều phong cách. Xem thử trực tiếp trước khi chọn.',
  },
  '/goi-dich-vu': {
    title: 'Bảng giá & gói dịch vụ — Thiệp Cưới Online',
    description: 'Báo giá theo đúng nhu cầu của hai bạn. Liên hệ để được tư vấn miễn phí.',
  },
  '/lien-he': {
    title: 'Liên hệ — Thiệp Cưới Online',
    description: 'Nhắn cho chúng tôi bất cứ lúc nào, kể cả khi chưa chốt mẫu hay chưa có ngày cưới.',
  },
  '/dat-thiep': {
    title: 'Đặt thiệp cưới — Thiệp Cưới Online',
    description: 'Điền thông tin, chúng tôi dựng thiệp và gửi bản xem trước để hai bạn duyệt.',
  },
}

// Trang không nên bị lập chỉ mục hay chia sẻ.
const isPrivate = (p) => p === '/quan-ly' || p === '/demo' || p.startsWith('/mau/') || p.startsWith('/_thumb/')

// ---------- Phát file tĩnh ----------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
}

function tryStatic(pathname, res) {
  // normalize + chặn '..' — không có bước này thì /../../etc/passwd đọc được file ngoài dist.
  const rel = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '')
  if (rel.includes('..')) return false

  const file = join(DIST, rel)
  if (!file.startsWith(DIST)) return false
  if (!existsSync(file) || !statSync(file).isFile()) return false

  const ext = extname(file).toLowerCase()
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    // File trong /assets có hash trong tên nên cache vĩnh viễn được.
    'Cache-Control': rel.startsWith('assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
  })
  createReadStream(file).pipe(res)
  return true
}

const sendHtml = (res, html) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' })
  res.end(html)
}

// ---------- Lấy dữ liệu thiệp ----------

async function invitationMeta(slug, url) {
  const v = await directus(
    `/items/invitation_variants?filter[slug][_eq]=${encodeURIComponent(slug)}&limit=1&fields=invitation`,
  )
  const invId = v?.data?.[0]?.invitation
  if (!invId) return null

  const r = await directus(`/items/invitations/${invId}?fields=groom_name,bride_name,cover_photo,love_story,status`)
  const inv = r?.data
  if (!inv || inv.status !== 'published') return null

  const ev = await directus(
    `/items/events?filter[invitation][_eq]=${invId}&sort=event_at&limit=1&fields=event_at`,
  ).catch(() => null)
  const date = fmtDate(ev?.data?.[0]?.event_at)

  return metaTags({
    title: `${clean(inv.groom_name)} & ${clean(inv.bride_name)}${date ? ' — ' + date : ''}`,
    description: cut(inv.love_story, 200) || 'Trân trọng kính mời bạn đến chung vui cùng chúng tôi.',
    image: ogImage(inv.cover_photo),
    url,
    type: 'article',
  })
}

// ---------- Server ----------

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://x').pathname

  if (pathname === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end('{"ok":true}')
  }

  // File tĩnh có thật thì trả luôn (JS, CSS, ảnh thumbnail, hero…)
  if (pathname !== '/' && tryStatic(pathname, res)) return

  const url = SITE_URL + pathname

  if (STATIC_META[pathname]) return sendHtml(res, render(metaTags({ ...STATIC_META[pathname], url })))
  if (isPrivate(pathname)) {
    return sendHtml(res, render(metaTags({ title: 'Thiệp Cưới Online', description: '', url, noindex: true })))
  }

  // Còn lại: coi như slug thiệp
  const slug = pathname.slice(1)
  if (/^[a-z0-9-]{2,80}$/i.test(slug)) {
    try {
      const meta = await invitationMeta(slug, url)
      if (meta) return sendHtml(res, render(meta))
    } catch (err) {
      // Directus lỗi hay chậm → vẫn trả app như bình thường, chỉ mất thẻ OG.
      // Thiệp phải mở được kể cả khi backend trục trặc.
      console.warn(`[og] không lấy được dữ liệu cho "${slug}": ${err.message}`)
    }
  }

  sendHtml(res, render(metaTags({ title: 'Thiệp Cưới Online', description: '', url })))
})

server.listen(PORT, () => {
  console.log(`▶ Server chạy ở cổng ${PORT}`)
  console.log(`  SITE_URL          ${SITE_URL}`)
  console.log(`  Directus (server) ${INTERNAL_DIRECTUS}`)
  console.log(`  Directus (ảnh OG) ${PUBLIC_DIRECTUS}`)
})
