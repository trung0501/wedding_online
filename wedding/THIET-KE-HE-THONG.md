# Thiệp Cưới Online — Tài liệu thiết kế hệ thống

> Nền tảng SaaS thiệp cưới điện tử (tham chiếu: motdoi.com.vn) · Stack: **Directus + React/Vite + Postgres + Docker**
> Trạng thái: v1 — bản thảo để chốt trước khi code · Ngày: 2026-07-13

---

## 1. Tổng quan & định vị

Xây một nền tảng nơi **cặp đôi tự đăng ký, chọn mẫu thiệp, điền thông tin và tạo ra thiệp cưới online tương tác**. Mỗi thiệp sinh ra **3 link** (chung / nhà trai / nhà gái), hỗ trợ **cá nhân hóa tên từng khách mời**, và có **RSVP + lưu bút + album + mừng cưới QR**. Khách mời xem qua link, không cần đăng nhập.

Nguyên tắc kiến trúc:

- **Directus** = backend toàn diện: DB schema, REST/GraphQL API, auth (JWT), phân quyền, admin panel, file storage, automation (Flows). Không phải viết backend riêng.
- **React/Vite** = 2 phần frontend: (a) **Dashboard** cho chủ thiệp quản lý; (b) **Renderer** hiển thị thiệp public cho khách.
- **Docker Compose** = Postgres + Directus + (dev) Vite. Deploy đồng nhất.

---

## 2. Actor (vai trò)

| Actor                          | Đăng nhập?         | Làm gì                                                                     |
| ------------------------------ | ------------------ | -------------------------------------------------------------------------- |
| **Khách mời** (Guest)          | Không              | Mở link thiệp, xem nội dung, RSVP, ký lưu bút, xem bản đồ/QR               |
| **Chủ thiệp** (Host — cặp đôi) | Có (Directus user) | Đăng ký, chọn mẫu, tạo & sửa thiệp, thêm khách, xem RSVP/thống kê, publish |
| **Admin** (bạn)                | Có (role Admin)    | Quản lý template, danh mục, kiểm duyệt, xem toàn bộ user/thiệp             |

---

## 3. Luồng nghiệp vụ chuẩn

### 3.1 Luồng chủ thiệp (tạo thiệp)

1. Đăng ký / đăng nhập → có tài khoản Host.
2. Chọn **template** từ thư viện → hệ thống tạo `invitation` ở trạng thái `draft`, gán template.
3. Wizard điền thông tin theo bước: (a) cô dâu–chú rể & 2 nhà → (b) các mốc lễ/tiệc (`events`) → (c) album ảnh → (d) love story → (e) mừng cưới (QR) → (f) tùy chỉnh (nhạc, hiệu ứng, đếm ngược).
4. Xem trước (preview) real-time với template đã chọn. **Đổi template bất kỳ lúc nào** mà không mất dữ liệu (data tách khỏi template).
5. **Publish** → Directus Flow tự sinh **3 `invitation_variants`** (combined/groom/bride) với slug duy nhất, trạng thái chuyển `published`.
6. (Tùy chọn) Thêm **danh sách khách** → mỗi khách nhận `token` → link cá nhân hóa hiển thị đúng tên.
7. Gửi link cho khách (copy/QR/Zalo).

### 3.2 Luồng khách mời (xem & phản hồi)

1. Mở link: `/{slug}` hoặc `/{slug}?g={guest_token}`.
2. Renderer đọc `invitation` (public read, chỉ bản `published`) + variant config → hiển thị thiệp. Nếu có `guest_token` → chèn tên khách vào lời mời.
3. Khách **RSVP** (tham dự / không / số người đi / lời nhắn) → ghi vào `rsvps`.
4. Khách **ký lưu bút** → ghi vào `guestbook` (có thể chờ duyệt).
5. (Ghi nhận lượt xem vào `invitation_views` — tùy chọn analytics).

### 3.3 Quy tắc nghiệp vụ (business rules)

- Data nội dung **độc lập với template** → đổi mẫu không mất data.
- `slug` của mỗi variant **unique toàn hệ thống**; `guest.token` **unique trong 1 thiệp**.
- Khách chỉ ghi được RSVP/lưu bút vào thiệp **đang published** (không sửa/đọc thiệp draft của người khác).
- Chủ thiệp **chỉ thao tác trên thiệp mình sở hữu** (`owner = current_user`) — enforce bằng Directus Policies.
- 3 variant khác nhau ở **display_config** (ẩn/hiện section theo phía nhà trai/gái), không nhân bản data.
- RSVP nên **upsert theo guest** (1 khách 1 bản mới nhất) nếu khách mở link cá nhân hóa; khách vô danh thì tạo bản mới.
- Lưu bút mặc định `status = approved`; bật moderation (`pending`) nếu cần lọc spam.

---

## 4. Bộ tính năng đề xuất (chuyên gia tư vấn)

Trung chưa chọn được nên chuyên gia phân theo 3 nhóm ưu tiên. Đề xuất: làm hết **MVP**, dựng khung cho **V1**, để dành **V2**.

### MVP (bắt buộc — bản chạy được đầu tiên)

- Renderer thiệp đẹp, responsive mobile-first, 1–2 template.
- Thông tin cặp đôi + 2 nhà, các mốc **lễ/tiệc** kèm ngày giờ & địa điểm.
- **RSVP + quản lý khách** (dashboard xem danh sách, thống kê tham dự).
- **Đếm ngược** ngày cưới, **bản đồ** Google Maps.
- Auth chủ thiệp + CRUD thiệp cơ bản.

### V1 (đúng "chất" motdoi)

- **3 link** chung / nhà trai / nhà gái.
- **Link cá nhân hóa theo khách** (điền tên từng khách).
- **Album ảnh** + **love story**.
- **Lưu bút** (guestbook).
- **Mừng cưới QR** (STK ngân hàng nhà trai/nhà gái).
- Thư viện template + đổi mẫu bất kỳ lúc nào.
- **Nhạc nền**, hiệu ứng mở phong bì/hoa rơi.
- SEO/OG cho từng link (share Facebook/Zalo đẹp).

### V2 (làm sau)

- Thanh toán (VNPay/MoMo) + model free→unlock.
- Custom domain.
- Analytics lượt xem, xuất danh sách khách (Excel/CSV).
- Đa ngôn ngữ, gợi ý AI viết lời mời.

---

## 5. Schema dữ liệu (Directus collections)

> Ghi chú: dùng `directus_users` sẵn có cho auth chủ thiệp. `directus_files` cho ảnh/QR/nhạc. Kiểu M2O = many-to-one (khóa ngoại), O2M = one-to-many (hiển thị ngược).

### 5.1 `template_categories` — nhóm phong cách

| Field | Kiểu            | Ghi chú                                    |
| ----- | --------------- | ------------------------------------------ |
| id    | uuid (PK)       |                                            |
| name  | string          | "Truyền thống", "Thiên nhiên", "Lãng mạn"… |
| slug  | string (unique) |                                            |
| sort  | integer         | thứ tự hiển thị                            |

### 5.2 `templates` — mẫu thiệp

| Field            | Kiểu                      | Ghi chú                                                 |
| ---------------- | ------------------------- | ------------------------------------------------------- |
| id               | uuid (PK)                 |                                                         |
| name             | string                    | "Duyên dáng 01"                                         |
| slug             | string (unique)           |                                                         |
| description      | text                      | mô tả marketing                                         |
| category         | M2O → template_categories |                                                         |
| thumbnail        | M2O → directus_files      | ảnh preview lưới                                        |
| component_key    | string                    | key map tới React component render (vd `duyen-dang-01`) |
| style_tokens     | json                      | màu chủ đạo, font, biến CSS                             |
| default_sections | json                      | section bật mặc định                                    |
| badge            | enum(none/hot/new)        | nhãn Hot/New                                            |
| is_active        | boolean                   | đang mở bán                                             |
| sort             | integer                   |                                                         |
| price            | integer                   | 0 = free (để dành V2)                                   |

### 5.3 `invitations` — thiệp (bảng lõi)

| Field                       | Kiểu                           | Ghi chú                                                    |
| --------------------------- | ------------------------------ | ---------------------------------------------------------- |
| id                          | uuid (PK)                      |                                                            |
| owner                       | M2O → directus_users           | chủ thiệp                                                  |
| template                    | M2O → templates                | mẫu đang dùng                                              |
| status                      | enum(draft/published/archived) |                                                            |
| groom_name                  | string                         | tên hiển thị chú rể                                        |
| groom_full_name             | string                         |                                                            |
| groom_father / groom_mother | string                         | thông tin nhà trai                                         |
| bride_name                  | string                         |                                                            |
| bride_full_name             | string                         |                                                            |
| bride_father / bride_mother | string                         | thông tin nhà gái                                          |
| cover_photo                 | M2O → directus_files           | ảnh bìa                                                    |
| couple_photo                | M2O → directus_files           |                                                            |
| love_story                  | json/text (rich)               | câu chuyện tình yêu                                        |
| settings                    | json                           | `{music_file_id, effects, show_countdown, theme_override}` |
| published_at                | timestamp                      |                                                            |
| created_at / updated_at     | timestamp                      |                                                            |

O2M: `events`, `photos`, `guests`, `rsvps`, `guestbook`, `gift_accounts`, `variants`.

### 5.4 `invitation_variants` — 3 biến thể link

| Field          | Kiểu                       | Ghi chú                              |
| -------------- | -------------------------- | ------------------------------------ |
| id             | uuid (PK)                  |                                      |
| invitation     | M2O → invitations          |                                      |
| variant_type   | enum(combined/groom/bride) |                                      |
| slug           | string (unique)            | dùng cho URL public                  |
| display_config | json                       | section nào hiển thị cho variant này |

### 5.5 `events` — mốc lễ / tiệc

| Field             | Kiểu                                              | Ghi chú          |
| ----------------- | ------------------------------------------------- | ---------------- |
| id                | uuid (PK)                                         |                  |
| invitation        | M2O → invitations                                 |                  |
| event_type        | enum(le_vu_quy/le_tan_hon/le_thanh_hon/tiec_cuoi) |                  |
| title             | string                                            | "Lễ Vu Quy"      |
| datetime          | timestamp                                         | ngày giờ         |
| venue_name        | string                                            | tên địa điểm     |
| address           | text                                              |                  |
| map_lat / map_lng | float                                             | tọa độ           |
| map_url           | string                                            | link Google Maps |
| side              | enum(groom/bride/both)                            | thuộc phía nào   |
| sort              | integer                                           |                  |

### 5.6 `photos` — album

| Field      | Kiểu                 | Ghi chú |
| ---------- | -------------------- | ------- |
| id         | uuid (PK)            |         |
| invitation | M2O → invitations    |         |
| image      | M2O → directus_files |         |
| caption    | string               |         |
| sort       | integer              |         |

### 5.7 `guests` — khách mời (cá nhân hóa)

| Field      | Kiểu                           | Ghi chú                         |
| ---------- | ------------------------------ | ------------------------------- |
| id         | uuid (PK)                      |                                 |
| invitation | M2O → invitations              |                                 |
| name       | string                         | tên khách                       |
| salutation | string                         | cách xưng hô ("Anh", "Cô Chú"…) |
| side       | enum(groom/bride/both)         | mời phía nào                    |
| tag        | string                         | nhóm ("Bạn ĐH", "Họ hàng"…)     |
| token      | string (unique per invitation) | dùng cho link `?g=`             |
| phone      | string                         |                                 |
| note       | text                           |                                 |

### 5.8 `rsvps` — xác nhận tham dự

| Field      | Kiểu                    | Ghi chú                |
| ---------- | ----------------------- | ---------------------- |
| id         | uuid (PK)               |                        |
| invitation | M2O → invitations       |                        |
| guest      | M2O → guests (nullable) | null nếu khách vô danh |
| name       | string                  | tên tự điền            |
| attending  | enum(yes/no/maybe)      |                        |
| num_guests | integer                 | số người đi            |
| side       | enum(groom/bride)       | dự tiệc phía nào       |
| message    | text                    | lời nhắn kèm           |
| created_at | timestamp               |                        |

### 5.9 `guestbook` — lưu bút / lời chúc

| Field      | Kiểu                    | Ghi chú    |
| ---------- | ----------------------- | ---------- |
| id         | uuid (PK)               |            |
| invitation | M2O → invitations       |            |
| guest      | M2O → guests (nullable) |            |
| name       | string                  |            |
| message    | text                    |            |
| status     | enum(pending/approved)  | moderation |
| created_at | timestamp               |            |

### 5.10 `gift_accounts` — mừng cưới QR

| Field          | Kiểu                 | Ghi chú         |
| -------------- | -------------------- | --------------- |
| id             | uuid (PK)            |                 |
| invitation     | M2O → invitations    |                 |
| side           | enum(groom/bride)    |                 |
| bank_name      | string               |                 |
| account_number | string               |                 |
| account_holder | string               |                 |
| qr_image       | M2O → directus_files | ảnh QR (VietQR) |

### 5.11 `invitation_views` — analytics (tùy chọn, V2)

| Field      | Kiểu                      | Ghi chú |
| ---------- | ------------------------- | ------- |
| id         | uuid (PK)                 |         |
| invitation | M2O → invitations         |         |
| variant    | M2O → invitation_variants |         |
| guest      | M2O → guests (nullable)   |         |
| viewed_at  | timestamp                 |         |
| user_agent | string                    |         |

### Sơ đồ quan hệ (rút gọn)

```
directus_users 1───* invitations *───1 templates *───1 template_categories
                         │
     ┌───────────────────┼───────────────────┬──────────────┬───────────────┐
     *                   *                   *              *               *
invitation_variants   events / photos      guests         rsvps         gift_accounts
                                              │ 1
                                              └───* rsvps / guestbook (guest nullable)
```

---

## 6. Phân quyền (Directus Policies)

| Role                 | invitations                                        | rsvps / guestbook                              | templates              |
| -------------------- | -------------------------------------------------- | ---------------------------------------------- | ---------------------- |
| **Public** (khách)   | read: chỉ `status=published`, chỉ field cần render | create: cho phép; read: chỉ của thiệp đang xem | read: `is_active=true` |
| **Host** (chủ thiệp) | full CRUD nhưng lọc `owner = $CURRENT_USER`        | read: của thiệp mình sở hữu                    | read                   |
| **Admin**            | full                                               | full                                           | full CRUD              |

Điểm cần chú ý (cảnh báo): Public role **phải giới hạn field** trả về (đừng expose `phone`, `note` của guests, đừng expose email owner). Tạo **Presets/Field Permissions** rõ ràng, tránh rò rỉ dữ liệu qua API công khai.

---

## 7. Kiến trúc & Docker

```
┌─────────────────────────────────────────────┐
│  Nginx / Caddy (reverse proxy, TLS)          │
└───────────┬───────────────────┬──────────────┘
            │                   │
   /admin,/api (Directus)   / (React app)
            │                   │
     ┌──────▼──────┐     ┌──────▼──────┐
     │  Directus   │     │  React/Vite │
     │  (Node)     │     │  build tĩnh │
     └──────┬──────┘     └─────────────┘
            │
     ┌──────▼──────┐   ┌──────────────┐
     │ PostgreSQL  │   │ Volume uploads│
     └─────────────┘   └──────────────┘
```

`docker-compose`: services `postgres`, `directus`, (dev) `web` (Vite). Uploads mount volume. Biến môi trường: `KEY`, `SECRET`, `DB_*`, `PUBLIC_URL`, `CORS_*`.

Frontend chia route:

- `dashboard.*` hoặc `/app/*` → khu quản lý (cần auth, gọi Directus SDK với JWT).
- `/{slug}` → renderer public (chỉ read, dùng static token public role).

**Directus Flows (automation) cần dựng:**

1. On `invitations.status → published`: tạo 3 `invitation_variants` + sinh slug.
2. On `rsvps.create`: gửi thông báo cho owner (email/Zalo/webhook) — tùy chọn.
3. On `guests.create`: sinh `token` ngẫu nhiên nếu trống.

---

## 8. Kế hoạch thực hiện theo phase

| Phase                         | Mục tiêu          | Việc chính                                                                                      | Kết quả nghiệm thu                                       |
| ----------------------------- | ----------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **P0 — Setup**                | Môi trường chạy   | docker-compose (Postgres + Directus), khởi tạo admin, kết nối Vite dev, Directus SDK            | `docker compose up` ra Directus admin + Vite hello world |
| **P1 — Data model**           | Dựng schema       | Tạo toàn bộ collections mục 5, relations, enum, roles/policies mục 6                            | Tạo được thiệp mẫu qua admin panel                       |
| **P2 — Renderer**             | Hiển thị thiệp    | Component template đầu tiên (`component_key`), render từ data thật, responsive, đếm ngược + map | Mở `/{slug}` thấy thiệp đẹp trên mobile                  |
| **P3 — RSVP + Lưu bút**       | Tương tác khách   | Form RSVP + guestbook ghi qua public role, validate, chống spam cơ bản                          | Khách submit, data vào Directus                          |
| **P4 — Dashboard**            | Chủ thiệp quản lý | Auth, list/CRUD thiệp, wizard tạo thiệp, preview, publish                                       | Host tự tạo & publish thiệp end-to-end                   |
| **P5 — 3 link + cá nhân hóa** | Đúng chất motdoi  | Flow sinh variants, quản lý guests, link `?g=token`, chèn tên                                   | 3 link chạy, link cá nhân hóa hiện đúng tên              |
| **P6 — Template system**      | Mở rộng mẫu       | 3–5 template, danh mục, đổi mẫu không mất data, badge Hot/New                                   | Đổi mẫu mượt, thư viện hiển thị                          |
| **P7 — Polish**               | Hoàn thiện        | Nhạc nền, hiệu ứng, mừng cưới QR, album, SEO/OG per-link                                        | Share Zalo/FB đẹp, hiệu ứng mượt                         |
| **P8 — V2 (sau)**             | Kinh doanh        | Thanh toán, custom domain, analytics, export                                                    | (khi cần)                                                |

Thứ tự này cho **demo được từ P2** (đã thấy thiệp), và **bán được từ P5** (đúng mô hình motdoi).

---

## 9. Quyết định cần Trung chốt trước P0

1. **Cấu trúc frontend**: 1 app React duy nhất (route tách dashboard/public) hay 2 app riêng? → Đề xuất: **1 app, tách route** cho gọn ở giai đoạn đầu.
2. **Renderer template**: mỗi mẫu là **1 React component riêng** (linh hoạt tối đa, đúng cho thiệp cưới nhiều hiệu ứng) hay **1 layout + config JSON**? → Đề xuất: **component riêng** map qua `component_key`.
3. **Domain/URL**: dạng `tenmien.vn/{slug}` hay subdomain `{slug}.tenmien.vn`? → Đề xuất path `/` cho đơn giản, subdomain để V2.
4. **ID**: dùng `uuid` (khó đoán, an toàn cho link public) hay auto-increment? → Đề xuất **uuid** cho `invitations`/`variants`.
5. **Storage ảnh**: local volume hay S3/Cloud? → Local volume cho MVP, chuyển S3 khi lên production.
