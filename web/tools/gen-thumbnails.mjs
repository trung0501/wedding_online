// ============================================================
//  Chụp ảnh thumbnail cho từng mẫu thiệp bằng Chromium (Playwright).
//  Ảnh chụp là GIAO DIỆN THẬT của mẫu — đúng font, đúng màu, đúng bố cục.
//
//  Nguồn mẫu: src/templates/registry.ts (tự đọc, không cần khai báo tay)
//  Kết quả:   public/thumbs/<component_key>.jpg  (900x1200, tỉ lệ 3:4, JPEG q80)
//
//  CHẠY (từ thư mục web/):
//    npm install                      # lần đầu, cài cả playwright
//    npx playwright install chromium  # lần đầu, tải trình duyệt (~150MB)
//    npm run thumbs
//
//  Chạy lại bất cứ lúc nào sau khi sửa themes.ts để ảnh khớp thiết kế mới.
// ============================================================

import { readFileSync, mkdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const WEB = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(WEB, 'public', 'thumbs')
const PORT = 4178
const WIDTH = 900
const HEIGHT = 1200 // 3:4 khớp .gl-thumb { aspect-ratio: 3/4 }

// Đọc danh sách component_key thẳng từ registry.ts → thêm mẫu mới là script tự biết.
function readTemplateKeys() {
  const src = readFileSync(join(WEB, 'src', 'templates', 'registry.ts'), 'utf8')
  const block = src.match(/templateRegistry[^=]*=\s*\{([\s\S]*?)\n\}/)
  if (!block) throw new Error('Không đọc được templateRegistry trong registry.ts')
  return [...block[1].matchAll(/'([a-z0-9-]+)'\s*:/g)].map((m) => m[1])
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
  const keys = readTemplateKeys()
  console.log(`▶ ${keys.length} mẫu: ${keys.join(', ')}`)

  mkdirSync(OUT, { recursive: true })
  const server = await startPreview()
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] })

  try {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } })

    for (const key of keys) {
      await page.goto(`http://localhost:${PORT}/_thumb/${key}`, { waitUntil: 'networkidle', timeout: 45000 })
      await page.evaluate(() => document.fonts.ready) // chờ Google Fonts vẽ xong
      await page.waitForTimeout(600) // chờ ảnh bìa + đếm ngược ổn định
      // Không dùng fullPage → chụp đúng khung viewport = phần hero (min-height:100svh).
      // JPEG q80: ảnh chỉ hiện ở ô ~300px nên PNG là phí băng thông (800KB so với ~90KB).
      await page.screenshot({ path: join(OUT, `${key}.jpg`), type: 'jpeg', quality: 80 })
      console.log(`✓ ${key}.jpg`)
    }
  } finally {
    await browser.close()
    // npm sinh tiến trình con (vite) — kill mình npm là vite còn sống, script treo.
    // Diệt cả nhóm tiến trình rồi thoát cứng cho chắc.
    try {
      process.platform === 'win32' ? spawn('taskkill', ['/pid', String(server.pid), '/f', '/t']) : process.kill(-server.pid, 'SIGKILL')
    } catch {
      server.kill('SIGKILL')
    }
  }

  console.log('\n✅ Xong. Ảnh nằm ở web/public/thumbs/ — commit cùng code.')
  process.exit(0)
}

main().catch((err) => {
  console.error('\n❌ Lỗi:', err.message)
  process.exit(1)
})
