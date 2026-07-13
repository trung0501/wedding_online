# Wedding Platform — Thiệp cưới online

Nền tảng SaaS thiệp cưới điện tử. Stack: **Directus 11 + PostgreSQL 16 + React/Vite (TS) + Docker**.

Xem thiết kế hệ thống đầy đủ: [`THIET-KE-HE-THONG.md`](./THIET-KE-HE-THONG.md).

## Cấu trúc

```
wedding/
├── docker-compose.yml        # Postgres + Directus
├── .env.example              # biến môi trường (copy sang .env)
├── directus/
│   ├── uploads/              # file storage (gitignored)
│   └── extensions/           # extension Directus
├── web/                      # frontend React/Vite (TypeScript)
│   ├── .env.example          # copy sang web/.env
│   └── src/
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

Trang chủ hiển thị trạng thái **"Đã kết nối Directus"** nếu backend chạy đúng.

## Lệnh hữu ích

```powershell
docker compose down            # dừng (giữ dữ liệu trong ./data)
docker compose down -v         # dừng + xóa volume (mất dữ liệu)
docker compose pull            # cập nhật image
cd web; npm run build          # build production
```

## Lộ trình

Dự án đi theo 8 phase (xem tài liệu thiết kế). Hiện tại: **P0 — Setup xong**. Kế tiếp: **P1 — dựng schema collections trong Directus**.
