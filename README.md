# Wedding Platform — Thiệp cưới online

Nền tảng SaaS thiệp cưới điện tử. Stack: **Directus 11 + PostgreSQL 16 + React/Vite (TS) + Docker**.

Xem thiết kế hệ thống đầy đủ: [`wedding/THIET-KE-HE-THONG.md`](./wedding/THIET-KE-HE-THONG.md).

## Cấu trúc

```
wedding_online/
├── docker-compose.yml        # Postgres + Directus
├── .env                      # biến môi trường (gitignored)
├── wedding/
│   └── THIET-KE-HE-THONG.md  # tài liệu thiết kế hệ thống
├── directus/
│   ├── bootstrap-schema.mjs  # dựng 14 collections + relations
│   ├── seed-templates.mjs    # seed danh mục mẫu thiệp
│   ├── add-o2m-aliases.mjs   # alias O2M cho admin (gom quan hệ con vào trang cha)
│   ├── uploads/              # file storage (gitignored)
│   └── extensions/           # extension Directus
├── web/                      # frontend React/Vite (TypeScript)
│   ├── src/templates/        # BaseTemplate + themes.ts + registry.ts
│   ├── public/thumbs/        # ảnh preview mẫu (sinh tự động)
│   └── tools/                # gen-thumbnails.mjs
└── data/                     # dữ liệu Postgres (gitignored, tạo tự động)
```

## Chạy lần đầu (Windows / PowerShell)

Yêu cầu: **Docker Desktop** và **Node.js 20+**.

### 1. Backend (Directus + Postgres)

```powershell
# Từ thư mục gốc dự án
Copy-Item .env.example .env
# Mở .env, đổi mật khẩu và sinh KEY/SECRET ngẫu nhiên:
#   -join ((48..57)+(97..102) | Get-Random -Count 64 | % {[char]$_})

docker compose up -d          # khởi động; lần đầu sẽ pull image
docker compose logs -f directus   # xem log tới khi thấy "Server started"
```

Directus admin: <http://localhost:8055> — đăng nhập bằng `ADMIN_EMAIL` / `ADMIN_PASSWORD` trong `.env`.

### 2. Frontend (Vite dev)

```powershell
cd web
Copy-Item .env.example .env    # VITE_DIRECTUS_URL mặc định trỏ localhost:8055
npm install
npm run dev                    # mở http://localhost:5173
```

Trang chủ hiển thị **thư viện mẫu thiệp** nếu backend chạy đúng.

### 3. Nạp dữ liệu & cấu hình Directus

Chạy từ thư mục gốc, Directus phải đang bật. Cả ba script đều **idempotent** — chạy lại vô hại.

```powershell
node --env-file=.env directus/bootstrap-schema.mjs   # 14 collections + relations
node --env-file=.env directus/seed-templates.mjs     # danh mục mẫu thiệp
node --env-file=.env directus/add-o2m-aliases.mjs    # gom quan hệ con vào trang cha trong admin
```

## Đường dẫn chính

| URL | Trang |
| --- | --- |
| `/` | Thư viện mẫu |
| `/mau/:slug` | Xem trước một mẫu |
| `/dat-thiep` | Form intake (khách gửi brief) |
| `/:slug` | Thiệp thật của khách (chỉ bản `published`) |
| `/demo`, `/_thumb/:key` | Render bằng dữ liệu mẫu, không cần Directus |

## Lệnh hữu ích

```powershell
docker compose down            # dừng (giữ dữ liệu trong ./data)
docker compose down -v         # dừng + xóa volume (mất dữ liệu)
docker compose pull            # cập nhật image
cd web; npm run build          # build production
cd web; npm run thumbs         # chụp lại ảnh preview 6 mẫu (cần: npx playwright install chromium)
```

## Thêm một mẫu thiệp mới

Bốn chỗ sửa, không đụng `BaseTemplate.tsx`:

1. `web/src/templates/themes.ts` — thêm object theme (màu, font, hoạ tiết, bố cục)
2. `web/src/templates/TenMau01.tsx` — wrapper 7 dòng
3. `web/src/templates/registry.ts` — map `component_key` → component
4. `directus/seed-templates.mjs` — thêm 1 dòng, rồi chạy lại script

Cuối cùng chạy `npm run thumbs` để sinh ảnh preview.

## Lộ trình

Dự án đi theo 8 phase (xem tài liệu thiết kế).

| Phase | Trạng thái |
| --- | --- |
| P0 — Setup môi trường | ✅ |
| P1 — Data model | ⚠️ schema xong, **chưa cấu hình policies (mục 6)** |
| P2 — Renderer | ✅ BaseTemplate + 6 theme |
| P3 — Thư viện mẫu | ✅ có ảnh preview tự sinh |
| P4 — Form intake | ✅ ghi `briefs` (chưa upload `brief_photos`) |
| P5 — Vận hành admin | 🔄 alias O2M xong, còn workflow & `orders` |
| P6 — RSVP & lưu bút | RSVP xong, lưu bút chưa có UI |
| P7 — Nâng cao | 3 link, cá nhân hoá, nhạc, SEO/OG |
| P8 — Hybrid → A | chưa bắt đầu |

**Việc cần làm tiếp**: phân quyền Public role (nợ từ P1) — bắt buộc trước khi deploy lên VPS.
