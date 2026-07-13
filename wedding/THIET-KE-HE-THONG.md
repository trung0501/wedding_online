# Thiệp Cưới Online — Tài liệu thiết kế hệ thống

> Nền tảng thiệp cưới điện tử · Stack: **Directus + React/Vite + Postgres + Docker**
> Mô hình giai đoạn đầu: **B — Concierge (làm dịch vụ)** · Định hướng sau: Hybrid → A (self-service)
> Trạng thái: v2 (pivot sang mô hình B) · Ngày: 2026-07-13

---

## 0. Mô hình kinh doanh

Giai đoạn đầu đi theo **mô hình B — Concierge**: khách hàng không tự thao tác, mà **mình (HVN) làm dịch vụ trọn gói**. Lý do: lần đầu triển khai, cần tập trung **chăm sóc khách hàng (CSKH)** và kiểm soát chất lượng, chưa cần đầu tư nặng vào dashboard tự phục vụ.

Vẫn giữ hai trụ cột: **thư viện mẫu thiết kế** + **form thu thập thông tin (intake/brief)**.

Định hướng dài hạn: khi đã có nhiều mẫu và lượng khách lớn, mở dần sang **A — Self-service** (khách tự tạo, tự thanh toán). Schema được thiết kế dùng chung nên chuyển đổi không mất dữ liệu.

---

## 1. Tổng quan & định vị

Khách hàng (cặp đôi) chọn mẫu và gửi thông tin qua **form intake**; hệ thống lưu thành `brief`. Nhân viên mở brief, **dựng thiệp** trong Directus (gán mẫu, điền nội dung, chèn ảnh), gửi **link preview** cho khách duyệt, chỉnh sửa qua lại đến khi chốt, rồi **thu tiền** và **bàn giao** (publish link chính thức). Mỗi thiệp có thể sinh **3 link** (chung / nhà trai / nhà gái) và hỗ trợ **cá nhân hóa tên khách mời**. Khách mời mở link để xem, **RSVP**, **lưu bút**.

Nguyên tắc kiến trúc:

- **Directus** = backend toàn diện + **công cụ vận hành nội bộ** (admin panel dùng luôn làm nơi nhân viên dựng/quản lý thiệp — không cần code dashboard riêng ở giai đoạn B).
- **React/Vite** = frontend công khai gồm: (a) **Trang thư viện mẫu** + **form intake**; (b) **Renderer** hiển thị thiệp cho khách mời.
- **Docker Compose** = Postgres + Directus + (dev) Vite.

---

## 2. Actor (vai trò)

| Actor | Đăng nhập? | Làm gì |
| --- | --- | --- |
| **Khách hàng** (Client — cặp đôi thuê dịch vụ) | Không | Xem thư viện mẫu, chọn mẫu, điền form intake, upload ảnh, xem link preview và phản hồi |
| **Nhân viên / Admin** (HVN) | Có | Nhận brief, dựng & hoàn thiện thiệp, gửi preview, cập nhật trạng thái, thu tiền, publish, kiểm duyệt |
| **Khách mời** (Guest — người dự cưới) | Không | Mở link thiệp, xem nội dung, RSVP, ký lưu bút, xem bản đồ/QR |

> Lưu ý: giai đoạn B **không có** vai trò "chủ thiệp tự đăng nhập tạo thiệp". Vai trò đó chỉ xuất hiện khi chuyển sang mô hình A.

---

## 3. Luồng nghiệp vụ chuẩn (mô hình B)

### 3.1 Luồng dịch vụ (khách hàng ↔ nhân viên)

1. Khách xem **thư viện mẫu** trên web, chọn mẫu ưng ý.
2. Khách điền **form intake**: thông tin liên hệ, tên cô dâu–chú rể & 2 nhà, ngày giờ lễ/tiệc, địa điểm, lời nhắn, **upload ảnh** → hệ thống tạo bản ghi `brief` (trạng thái `new`).
3. Nhân viên nhận brief (thông báo), liên hệ tư vấn/CSKH nếu cần.
4. Nhân viên tạo `invitation` (trạng thái `draft`) từ brief, gán mẫu, điền nội dung, chèn ảnh (`photos`), tạo các mốc lễ/tiệc (`events`).
5. Nhân viên chuyển `invitation.status = review` → gửi **link preview** cho khách.
6. Khách xem preview, phản hồi. Nhân viên chỉnh sửa (lặp lại bước 5) đến khi khách **duyệt** → `status = approved`.
7. Nhân viên báo giá & **thu tiền** (chuyển khoản), tạo/cập nhật `order` sang `paid`.
8. Nhân viên **publish** (`status = published`) → sinh **3 link** (`invitation_variants`) → bàn giao link cho khách.
9. (Tùy chọn) Thêm **danh sách khách mời** để cá nhân hóa link theo từng khách.

### 3.2 Luồng khách mời (xem & phản hồi)

1. Mở link: `/{slug}` hoặc `/{slug}?g={guest_token}`.
2. Renderer đọc `invitation` (public read, chỉ bản `published`) + variant config → hiển thị thiệp. Có `guest_token` → chèn tên khách vào lời mời.
3. Khách **RSVP** (tham dự / không / số người đi / lời nhắn) → ghi vào `rsvps`.
4. Khách **ký lưu bút** → ghi vào `guestbook` (có thể chờ duyệt).
5. (Tùy chọn) Ghi nhận lượt xem vào `invitation_views`.

### 3.3 Quy tắc nghiệp vụ (business rules)

- Dữ liệu nội dung **độc lập với mẫu thiết kế** → đổi mẫu không mất data.
- `brief` là dữ liệu thô do khách gửi; `invitation` là bản do nhân viên dựng — **tách bạch** để không cho public ghi thẳng vào bảng lõi.
- Form intake ghi vào Directus qua **public role**, chỉ được **tạo** `brief`/`brief_photos`, **không** đọc/sửa dữ liệu khác.
- Khách mời chỉ xem được thiệp `published`; RSVP/lưu bút chỉ ghi vào thiệp `published`.
- `slug` mỗi variant **unique toàn hệ thống**; `guest.token` **unique**.
- Cổng "đã thanh toán / được publish" **enforce ở backend** (permission/flow), không chỉ ẩn nút ở frontend.
- Lưu bút mặc định `status = approved`; bật moderation (`pending`) nếu cần lọc spam.

---

## 4. Bộ tính năng theo giai đoạn

### MVP-B (chạy dịch vụ được ngay)

- **Thư viện mẫu** công khai + trang xem chi tiết/preview mẫu.
- **Form intake** (khách chọn mẫu + gửi thông tin + upload ảnh) → lưu `brief`.
- **Renderer** thiệp đẹp, responsive mobile-first (1–2 mẫu đầu tiên).
- Vận hành trên **Directus admin**: dựng thiệp, quản lý brief, đổi trạng thái, thu tiền (`orders`).
- **Link preview** để khách duyệt; **publish** link chính thức.
- Các mốc lễ/tiệc, đếm ngược, bản đồ Google Maps.

### Mở rộng-B

- **3 link** chung / nhà trai / nhà gái.
- **Cá nhân hóa tên khách mời** (link `?g=token`).
- **RSVP + quản lý khách**, **Lưu bút**, **Album ảnh**, **Mừng cưới QR**.
- **Nhạc nền**, hiệu ứng mở phong bì/hoa rơi.
- SEO/OG cho từng link (share Facebook/Zalo đẹp).
- Thông báo brief/RSVP mới (email/Zalo) qua Directus Flow.

### Hybrid → A (làm sau)

- Tài khoản chủ thiệp tự đăng nhập, wizard tự tạo.
- Thanh toán online (VNPay/MoMo/QR auto-reconcile) + model free→unlock.
- Custom domain, analytics, xuất danh sách khách, đa ngôn ngữ, gợi ý AI.

---

## 5. Schema dữ liệu (Directus collections)

> Dùng `directus_users` cho tài khoản nhân viên/admin. `directus_files` cho ảnh/QR/nhạc. M2O = many-to-one (khóa ngoại), O2M = one-to-many.

### 5.1 `template_categories` — nhóm phong cách

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| name | string | "Truyền thống", "Thiên nhiên", "Lãng mạn"… |
| slug | string (unique) | |
| sort | integer | |

### 5.2 `templates` — mẫu thiệp

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| name | string | "Duyên dáng 01" |
| slug | string (unique) | |
| description | text | mô tả marketing |
| category | M2O → template_categories | |
| thumbnail | M2O → directus_files | ảnh preview lưới |
| component_key | string | key map tới React component render |
| style_tokens | json | màu, font, biến CSS |
| default_sections | json | section bật mặc định |
| badge | enum(none/hot/new) | nhãn Hot/New |
| is_active | boolean | đang mở bán |
| sort | integer | |
| price | integer | giá tham khảo (VND) |

### 5.3 `briefs` — form thu thập thông tin (MỚI — trụ cột mô hình B)

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| contact_name | string | tên người liên hệ |
| contact_phone | string | SĐT |
| contact_channel | string | Zalo/Facebook/email… |
| template | M2O → templates | mẫu khách chọn |
| groom_name | string | |
| bride_name | string | |
| event_info | text | ngày giờ, địa điểm lễ/tiệc (khách mô tả tự do) |
| wish | text | lời nhắn / yêu cầu riêng |
| status | enum(new/in_progress/quoted/paid/delivered/canceled) | trạng thái xử lý brief |
| invitation | M2O → invitations | thiệp nhân viên dựng từ brief (điền sau) |
| date_created | timestamp (date-created) | |

### 5.4 `brief_photos` — ảnh khách gửi kèm brief (MỚI)

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| brief | M2O → briefs (cascade) | |
| image | M2O → directus_files | ảnh khách upload |
| sort | integer | |

### 5.5 `invitations` — thiệp (bảng lõi)

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| owner | M2O → directus_users | nhân viên phụ trách |
| template | M2O → templates | mẫu đang dùng |
| status | enum(draft/review/approved/published/archived) | quy trình duyệt của mô hình B |
| groom_name / groom_full_name / groom_father / groom_mother | string | nhà trai |
| bride_name / bride_full_name / bride_father / bride_mother | string | nhà gái |
| cover_photo | M2O → directus_files | ảnh bìa |
| couple_photo | M2O → directus_files | |
| love_story | text | câu chuyện tình yêu |
| settings | json | nhạc, hiệu ứng, đếm ngược… |
| published_at | timestamp | |
| date_created / date_updated | timestamp | special date-created / date-updated |

### 5.6 `invitation_variants` — 3 biến thể link

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| invitation | M2O → invitations (cascade) | |
| variant_type | enum(combined/groom/bride) | |
| slug | string (unique) | dùng cho URL public |
| display_config | json | section nào hiển thị |

### 5.7 `events` — mốc lễ / tiệc

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| invitation | M2O → invitations (cascade) | |
| event_type | enum(le_vu_quy/le_tan_hon/le_thanh_hon/tiec_cuoi) | |
| title | string | |
| event_at | timestamp | ngày giờ (đổi tên từ `datetime` để tránh từ khóa SQL) |
| venue_name | string | |
| address | text | |
| map_lat / map_lng | float | |
| map_url | string | |
| side | enum(groom/bride/both) | |
| sort | integer | |

### 5.8 `photos` — album (nhân viên dựng)

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| invitation | M2O → invitations (cascade) | |
| image | M2O → directus_files | |
| caption | string | |
| sort | integer | |

### 5.9 `guests` — khách mời (cá nhân hóa)

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| invitation | M2O → invitations (cascade) | |
| name | string | |
| salutation | string | cách xưng hô |
| side | enum(groom/bride/both) | |
| tag | string | nhóm khách |
| token | string (unique) | dùng cho link `?g=` |
| phone | string | |
| note | text | |

### 5.10 `rsvps` — xác nhận tham dự

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| invitation | M2O → invitations (cascade) | |
| guest | M2O → guests (set null) | null nếu khách vô danh |
| name | string | |
| attending | enum(yes/no/maybe) | |
| num_guests | integer | |
| side | enum(groom/bride) | |
| message | text | |
| date_created | timestamp (date-created) | |

### 5.11 `guestbook` — lưu bút / lời chúc

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| invitation | M2O → invitations (cascade) | |
| guest | M2O → guests (set null) | |
| name | string | |
| message | text | |
| status | enum(pending/approved) | moderation |
| date_created | timestamp (date-created) | |

### 5.12 `gift_accounts` — mừng cưới QR

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| invitation | M2O → invitations (cascade) | |
| side | enum(groom/bride) | |
| bank_name / account_number / account_holder | string | |
| qr_image | M2O → directus_files | |

### 5.13 `orders` — theo dõi thu tiền (MỚI — thanh toán thủ công B)

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| invitation | M2O → invitations (set null) | thiệp tương ứng |
| brief | M2O → briefs (set null) | brief tương ứng |
| amount | integer | số tiền (VND) |
| status | enum(pending/paid/canceled) | |
| method | string | chuyển khoản / tiền mặt… |
| paid_at | timestamp | |
| note | text | |
| date_created | timestamp (date-created) | |

### 5.14 `invitation_views` — analytics lượt xem (tùy chọn)

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| invitation | M2O → invitations (cascade) | |
| variant | M2O → invitation_variants (cascade) | |
| guest | M2O → guests (set null) | |
| date_created | timestamp (date-created) | |
| user_agent | string | |

### Quan hệ chính (rút gọn)

```
templates ─* briefs ─* brief_photos            (khách gửi thông tin + ảnh)
briefs 1─ invitation (nhân viên dựng)
directus_users ─* invitations ─* {events, photos, guests, rsvps, guestbook, gift_accounts, variants, views}
invitations ─* orders *─ briefs               (thu tiền)
```

---

## 6. Phân quyền (Directus Policies)

| Role | Quyền |
| --- | --- |
| **Public** | create: `briefs`, `brief_photos` (form intake); create: `rsvps`, `guestbook` (khách mời); read: `templates`(is_active), `invitations`(chỉ published + field an toàn), `invitation_variants`, `events`, `photos`, `gift_accounts`. **Không** read `briefs`/`guests`(field nhạy cảm)/`orders`. |
| **Staff/Admin** | full CRUD toàn bộ. |

Cảnh báo bảo mật: Public role phải **giới hạn field** trả về — không expose `guests.phone/note`, `briefs.contact_phone`, email nhân viên, hay `orders`. Form intake chỉ được **create**, tuyệt đối không cho read/update.

---

## 7. Kiến trúc & Docker

```
Nginx/Caddy → /admin,/api (Directus)  |  / (React: thư viện mẫu + form intake + renderer)
Directus → PostgreSQL + volume uploads
```

- **Công cụ vận hành (giai đoạn B) = Directus admin panel** (không code dashboard riêng).
- Frontend tự code: **trang thư viện mẫu + form intake** và **renderer thiệp**.
- Directus Flows: (1) thông báo khi có `brief` mới; (2) sinh 3 `invitation_variants` khi `status → published`; (3) thông báo khi có `rsvp` mới.

---

## 8. Kế hoạch thực hiện (roadmap mô hình B)

| Phase | Mục tiêu | Việc chính | Nghiệm thu |
| --- | --- | --- | --- |
| **P0 — Setup** ✅ | Môi trường | docker-compose (Postgres+Directus), Vite, SDK | `docker compose up` + Vite chạy |
| **P1 — Data model** | Dựng schema | Chạy `bootstrap-schema.mjs` (14 collections + relations), cấu hình policies mục 6 | Thấy đủ collection trong Data Model |
| **P2 — Renderer** | Hiển thị thiệp | Component mẫu đầu tiên, render từ data thật, responsive, đếm ngược + map | Mở `/{slug}` thấy thiệp đẹp trên mobile |
| **P3 — Thư viện mẫu** | Trưng bày mẫu | Trang list mẫu (từ `templates`) + xem chi tiết/preview | Khách xem được các mẫu |
| **P4 — Form intake** | Thu thập thông tin | Form public ghi `briefs` + upload `brief_photos` (public create, giới hạn quyền) | Khách gửi brief + ảnh, data vào Directus |
| **P5 — Vận hành** | Quy trình dịch vụ | Cấu hình Directus admin: layout, workflow trạng thái, brief→invitation, link preview, `orders` | Nhân viên dựng & bàn giao 1 thiệp end-to-end |
| **P6 — Tương tác khách mời** | RSVP + lưu bút | Form RSVP/guestbook (public create), dashboard xem trong admin | Khách mời RSVP/lưu bút được |
| **P7 — Nâng cao** | Đúng "chất" | 3 link, cá nhân hóa khách, album, QR, nhạc, hiệu ứng, SEO/OG | Share Zalo/FB đẹp, đủ tính năng |
| **P8 — Hybrid→A** | Tự động hóa | Tài khoản chủ thiệp, thanh toán online | (khi mở rộng) |

---

## 9. Quyết định & giả định

1. **Frontend**: 1 app React, tách route (thư viện mẫu + intake) và renderer public. ✅
2. **Renderer mẫu**: mỗi mẫu là 1 React component riêng, map qua `component_key`. ✅
3. **URL**: path `/{slug}` (subdomain để giai đoạn sau). ✅
4. **ID**: `uuid` cho các bảng public-facing (khó đoán, an toàn cho link). ✅
5. **Ảnh khách gửi**: upload trực tiếp trong form intake → `brief_photos` (public create). Cần chống spam (giới hạn dung lượng/loại file, có thể thêm captcha sau). *Có thể điều chỉnh.*
6. **Thanh toán (B)**: **thủ công** — chuyển khoản, nhân viên đối chiếu và cập nhật `orders`. Tự động hóa (VNPay/MoMo/QR-reconcile) để giai đoạn Hybrid→A. *Chốt cổng cụ thể sau.*
