// ============================================================
//  Chụp ảnh thumbnail cho từng mẫu thiệp bằng Chromium (Playwright).
//
//  Chụp thẳng trang xem trước /mau/<slug> — tức là ĐÚNG thứ khách sẽ thấy
//  khi bấm vào thẻ mẫu. Nếu mẫu có demo_slug thì ảnh sẽ mang nội dung
//  thiệp demo thật trong Directus, không phải dữ liệu mẫu trong code.
//
//  Nguồn mẫu: directus/templates.json (nguồn sự thật của danh mục)
//  Kết quả:   public/thumbs/<component_key>.jpg  (900x1200, 3:4, JPEG q80)
//
//  YÊU CẦU: Directus phải đang chạy (trang xem trước cần đọc dữ liệu).
//
//  CHẠY (từ thư mục web/):
//    npm install                      # lần đầu
//    npx playwright install chromium  # lần đầu, tải trình duyệt (~150MB)
//    npm run thumbs
//
//  Chạy lại sau khi sửa themes.ts hoặc sửa nội dung thiệp demo.
// ============================================================

import { readFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'
import net from 'node:net'
import { chromium } from 'playwright'

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..')
const ROOT = join(WEB, '..')
const OUT = join(WEB, 'public', 'thumbs')
// PHẢI khớp CORS_ORIGIN trong .env gốc, nếu không Directus chặn request và
// trang xem trước không đọc được dữ liệu. Đổi CORS_ORIGIN thì đổi cả biến này.
const PORT = Number(process.env.THUMBS_PORT || 5173)
const WIDTH = 900
const HEIGHT = 1200 // 3:4 khớp .gl-thumb { aspect-ratio: 3/4 }

const DIRECTUS_URL = (process.env.VITE_DIRECTUS_URL || 'http://localhost:8055').replace(/\/$/, '')

function readTemplates() {
  const p = join(ROOT, 'directus', 'templates.json')
  const rows = JSON.parse(readFileSync(p, 'utf8'))
  for (const t of rows) {
    if (!t.slug || !t.component_key) throw new Error(`Mẫu thiếu slug/component_key trong templates.json`)
  }
  return rows
}

async function checkDirectus() {
  try {
    const r = await fetch(`${DIRECTUS_URL}/server/health`, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) throw new Error(String(r.status))
  } catch {
    throw new Error(
      `Không kết nối được Directus tại ${DIRECTUS_URL}\n` +
        `   Trang xem trước cần Directus để đọc mẫu và thiệp demo.\n` +
        `   Bật lên rồi chờ ~20 giây:  docker compose up -d`,
    )
  }
}

// Cổng 5173 thường đang bị `npm run dev` chiếm. Báo sớm cho rõ, đừng để
// vite preview chết lặng rồi script treo 30 giây mới timeout.
function checkPortFree() {
  return new Promise((resolve, reject) => {
    const sock = net.connect({ port: PORT, host: '127.0.0.1' })
    sock.setTimeout(1500)
    sock.on('connect', () => {
      sock.destroy()
      reject(
        new Error(
          `Cổng ${PORT} đang bị chiếm — nhiều khả năng là "npm run dev".\n` +
            `   Tắt nó đi rồi chạy lại (Ctrl+C ở cửa sổ đang chạy dev).\n` +
            `   Cổng này bắt buộc vì Directus chỉ cho phép CORS từ http://localhost:${PORT}`,
        ),
      )
    })
    sock.on('timeout', () => {
      sock.destroy()
      resolve()
    })
    sock.on('error', () => resolve()) // không kết nối được = cổng trống
  })
}

function startPreview() {
  const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const child = spawn(cmd, ['run', 'preview', '--', '--port', String(PORT), '--strictPort'], {
    cwd: WEB,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
    detached: process.platform !== 'win32', // tạo process group để diệt gọn cả cây tiến trình
  })
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('vite preview không khởi động kịp (30s)')), 30000)
    child.stdout.on('data', (d) => {
      if (d.toString().includes(String(PORT))) {
        clearTimeout(timer)
        setTimeout(() => resolve(child), 300)
      }
    })
    child.on('error', reject)
  })
}

async function main() {
  if (!existsSync(join(WEB, 'dist', 'index.html'))) {
    throw new Error('Chưa có bản build. Chạy trước: npm run build')
  }
  await checkDirectus()
  await checkPortFree()

  const templates = readTemplates()
  console.log(`▶ ${templates.length} mẫu từ directus/templates.json`)

  mkdirSync(OUT, { recursive: true })
  const server = await startPreview()
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })

  try {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } })

    for (const t of templates) {
      await page.goto(`http://localhost:${PORT}/mau/${t.slug}`, { waitUntil: 'networkidle', timeout: 45000 })

      // Trang xem trước có thanh điều hướng phía trên — không muốn nó lọt vào ảnh.
      await page.addStyleTag({ content: '.tp-bar{display:none !important}' })

      // Nếu slug sai hoặc Directus không trả dữ liệu, trang hiện thông báo lỗi.
      // Chụp cái đó thì ảnh hỏng mà không ai biết → dừng luôn cho rõ ràng.
      const body = await page.textContent('body')
      if (body?.includes('Không tìm thấy mẫu này')) {
        throw new Error(`Slug "${t.slug}" không có trong Directus. Chạy: node --env-file=.env directus/seed-templates.mjs`)
      }

      await page.evaluate(() => document.fonts.ready) // chờ Google Fonts vẽ xong
      await page.waitForTimeout(800) // chờ ảnh bìa tải xong

      // Không dùng fullPage → chụp đúng khung viewport = phần hero (min-height:100svh).
      // JPEG q80: ảnh chỉ hiện ở ô ~300px nên PNG là phí băng thông (800KB so với ~90KB).
      await page.screenshot({ path: join(OUT, `${t.component_key}.jpg`), type: 'jpeg', quality: 80 })
      console.log(`✓ ${t.component_key}.jpg   ← /mau/${t.slug}`)
    }
  } finally {
    await browser.close()
    // npm sinh tiến trình con (vite) — kill mình npm là vite còn sống, script treo.
    try {
      process.platform === 'win32' ? spawn('taskkill', ['/pid', String(server.pid), '/f', '/t']) : process.kill(-server.pid, 'SIGKILL')
    } catch {
      server.kill('SIGKILL')
    }
  }

  console.log('\n Xong. Ảnh nằm ở web/public/thumbs/ — commit cùng code.')
  process.exit(0)
}

main().catch((err) => {
  console.error('\n Lỗi:', err.message)
  process.exit(1)
})
