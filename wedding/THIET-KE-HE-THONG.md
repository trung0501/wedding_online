# Thiệp Cưới Online — Tài liệu thiết kế hệ thống

> Nền tảng thiệp cưới điện tử · Stack: **Directus 11 + React/Vite + Postgres 16 + Docker**
> Mô hình giai đoạn đầu: **B — Concierge (làm dịch vụ)** · Định hướng sau: Hybrid → A (self-service)
> Trạng thái: **v4** · Cập nhật: 2026-08-17

---

## Thay đổi v3 → v4

Bổ sung một năng lực hoàn toàn mới và vá vài chỗ tài liệu chưa theo kịp code:

- **Mục 6b (mới)** — role **"Chủ thiệp"**: tài khoản cho cặp đôi khách hàng tự theo dõi khách mời. Giải quyết luôn việc còn nợ #1 của v3.
- **Mục 5.5** — `invitations` thêm field `client_user`.
- **Mục 5.3** — `briefs` thêm `contact_email` và `source`.
- **Mục 8.6 (mới)** — kích thước ảnh: 5 preset resize. Trước đó renderer gửi ảnh gốc, một album 100 ảnh nặng 300MB.
- **Mục 6** — `guestbook.create` dùng `presets` để Directus tự gán `status = approved`.
- **Mục 7** — biến môi trường cho ảnh, và cách chạy script quản trị trỏ lên VPS.
- **Mục 3.2** — tường lời chúc công khai trên thiệp (đã làm, v3 còn ghi là chưa).

## Thay đổi v2 → v3

Tài liệu v2 mô tả *ý định*. Bản v3 này chỉnh lại cho khớp **thực tế đã code**, sau khi rà soát toàn bộ hệ thống:

- **Mục 5.2** — bổ sung field `demo_slug` (đã thêm từ P3 nhưng chưa ghi vào tài liệu).
- **Mục 6** — viết lại hoàn toàn. Bản cũ thiếu `directus_files` (không có nó thì mọi ảnh 403), thiếu điều kiện lọc cho bảng con, và không nêu danh sách field cụ thể.
- **Mục 6 & 3.3** — gỡ mâu thuẫn về lưu bút: mục 6 cũ không cấp quyền đọc, trong khi mục 3.3 lại hàm ý có hiển thị.
- **Mục 8 (mới)** — kiến trúc renderer. Bản cũ nói "mỗi mẫu là 1 component riêng"; thực tế là **một `BaseTemplate` dùng chung + theme**, khác hẳn về khả năng mở rộng.
- **Mục 9 (mới)** — danh sách script vận hành và `templates.json`.
- **Mục 12 (mới)** — các việc còn nợ đã biết, để không bị quên.

---

## 0. Mô hình kinh doanh

Giai đoạn đầu đi theo **mô hình B — Concierge**: khách hàng không tự thao tác, mà **mình (HVN) làm dịch vụ trọn gói**. Lý do: lần đầu triển khai, cần tập trung **chăm sóc khách hàng** và kiểm soát chất lượng, chưa cần đầu tư nặng vào dashboard tự phục vụ.

Hai trụ cột: **thư viện mẫu thiết kế** + **form thu thập thông tin (intake/brief)**.

Định hướng dài hạn: khi đã có nhiều mẫu và lượng khách lớn, mở dần sang **A — Self-service**. Schema được thiết kế dùng chung nên chuyển đổi không mất dữ liệu.

---

## 1. Tổng quan & định vị

Khách hàng (cặp đôi) chọn mẫu và gửi thông tin qua **form intake**; hệ thống lưu thành `brief`. Nhân viên mở brief, **dựng thiệp** trong Directus (gán mẫu, điền nội dung, chèn ảnh), gửi **link** cho khách duyệt, chỉnh sửa qua lại đến khi chốt, rồi **thu tiền** và **bàn giao** (publish link chính thức). Mỗi thiệp có thể sinh **3 link** (chung / nhà trai / nhà gái) và hỗ trợ **cá nhân hóa tên khách mời**. Khách mời mở link để xem, **RSVP**, **lưu bút**.

Nguyên tắc kiến trúc:

- **Directus** = backend toàn diện + **công cụ vận hành nội bộ** (admin panel dùng luôn làm nơi nhân viên dựng/quản lý thiệp — không code dashboard riêng ở giai đoạn B).
- **React/Vite** = frontend công khai gồm: (a) **Trang thư viện mẫu** + **form intake**; (b) **Renderer** hiển thị thiệp cho khách mời.
- **Docker Compose** = Postgres + Directus.
- **Mọi cấu hình Directus đều được script hoá** (xem mục 9) — không có bước "bấm tay trong admin" nào là bắt buộc, để dựng lại trên VPS không sai sót.

---

## 2. Actor (vai trò)

| Actor | Đăng nhập? | Làm gì |
| --- | --- | --- |
| **Khách hàng** (Client — cặp đôi thuê dịch vụ) | Không | Xem thư viện mẫu, chọn mẫu, điền form intake, xem link và phản hồi |
| **Nhân viên / Admin** (HVN) | Có | Nhận brief, dựng & hoàn thiện thiệp, gửi link, cập nhật trạng thái, thu tiền, publish, kiểm duyệt |
| **Khách mời** (Guest) | Không | Mở link thiệp, xem nội dung, RSVP, ký lưu bút, xem bản đồ/QR |

> Giai đoạn B **không có** vai trò "chủ thiệp tự đăng nhập tạo thiệp". Vai trò đó chỉ xuất hiện khi chuyển sang mô hình A.

---

## 3. Luồng nghiệp vụ chuẩn (mô hình B)

### 3.1 Luồng dịch vụ (khách hàng ↔ nhân viên)

1. Khách xem **thư viện mẫu** trên web, chọn mẫu ưng ý.
2. Khách điền **form intake**: thông tin liên hệ, tên cô dâu–chú rể, ngày giờ lễ/tiệc, địa điểm, lời nhắn → hệ thống tạo `brief` (trạng thái `new`).
3. Nhân viên nhận brief, liên hệ tư vấn. **Khách gửi ảnh cưới qua Zalo/Facebook**, nhân viên tự upload vào Directus.
4. Nhân viên tạo `invitation` (`draft`) từ brief, gán mẫu, điền nội dung, chèn ảnh (`photos`), tạo các mốc lễ/tiệc (`events`).
5. Nhân viên chuyển `status = review` → gửi link cho khách xem.
6. Khách phản hồi, nhân viên chỉnh sửa (lặp lại bước 5) đến khi khách **duyệt** → `status = approved`.
7. Nhân viên báo giá & **thu tiền** (chuyển khoản), tạo/cập nhật `order` sang `paid`.
8. Nhân viên **publish** (`status = published`) → sinh **3 link** (`invitation_variants`) → bàn giao link cho khách.
9. (Tùy chọn) Thêm **danh sách khách mời** để cá nhân hóa link theo từng khách.

> **Khác v2**: bước 2 ban đầu dự tính khách tự upload ảnh trong form. Thực tế khách gửi qua Zalo và nhân viên upload — cách này an toàn hơn (không mở quyền ghi file cho public) nên giữ nguyên. Quyền `brief_photos.create` vẫn được cấp sẵn cho khi làm tính năng upload.

### 3.2 Luồng khách mời (xem & phản hồi)

1. Mở link: `/{slug}` hoặc `/{slug}?g={guest_token}`.
2. Renderer đọc `invitation_variants` theo slug → lấy `invitation` (chỉ bản `published`) → đọc `events`, `photos`, `gift_accounts`, `templates` → hiển thị thiệp. Có `guest_token` → chèn tên khách vào lời mời *(chưa làm — P7)*.
3. Khách **RSVP** → ghi vào `rsvps`.
4. Khách **ký lưu bút**: lời chúc trong form RSVP được ghi vào cả `guestbook`, hiện thành **tường lưu bút** ngay dưới form — khách mời đọc được lời chúc của nhau.
5. (Tùy chọn) Ghi nhận lượt xem vào `invitation_views` *(chưa làm)*.

### 3.3 Quy tắc nghiệp vụ

- Dữ liệu nội dung **độc lập với mẫu thiết kế** → đổi mẫu không mất data.
- `brief` là dữ liệu thô do khách gửi; `invitation` là bản do nhân viên dựng — **tách bạch** để không cho public ghi thẳng vào bảng lõi.
- Form intake ghi vào Directus qua **public role**, chỉ được **tạo** `brief`, **không** đọc/sửa dữ liệu khác.
- Khách mời chỉ xem được thiệp `published`. **Bảng con (`events`, `photos`, `gift_accounts`, `invitation_variants`) cũng phải lọc theo trạng thái thiệp cha** — che thiệp mà không che ruột thì địa chỉ tiệc và số tài khoản vẫn đọc được.
- `slug` mỗi variant **unique toàn hệ thống**; `guest.token` **unique**.
- Cổng "đã thanh toán / được publish" **enforce ở backend** (permission), không chỉ ẩn nút ở frontend.
- **Lưu bút**: mặc định `status = approved`. Public **được đọc nhưng chỉ bản `approved`** — giữ đường cho việc hiển thị lời chúc trên thiệp, mà bật moderation (`pending`) vẫn có tác dụng. Public **không** được ghi field `status`.
- **Ảnh**: chỉ file nằm trong folder `Public` mới đọc được từ ngoài. Folder này là folder upload mặc định, nên thao tác bình thường của nhân viên tự động đúng.

---

## 4. Bộ tính năng theo giai đoạn

### MVP-B (chạy dịch vụ được ngay)

| Tính năng | Trạng thái |
| --- | --- |
| Thư viện mẫu công khai + ảnh preview | ✅ |
| Trang xem trước từng mẫu | ✅ |
| Form intake → `brief` | ✅ |
| Renderer responsive mobile-first | ✅ 6 mẫu |
| Vận hành trên Directus admin | ✅ (đã gom quan hệ con vào trang cha) |
| Publish link chính thức | ✅ |
| Mốc lễ/tiệc, đếm ngược, link bản đồ | ✅ |
| Thu tiền (`orders`) | ⬜ collection có, chưa dùng |
| Link cho khách duyệt khi `status = review` | ⬜ xem mục 12 |

### Mở rộng-B

3 link chung/nhà trai/nhà gái · cá nhân hóa tên khách mời (`?g=token`) · quản lý khách & RSVP · lưu bút · album ảnh · mừng cưới QR · nhạc nền · hiệu ứng · SEO/OG cho từng link · thông báo brief/RSVP mới qua Directus Flow.

### Hybrid → A

Tài khoản chủ thiệp tự đăng nhập · wizard tự tạo · thanh toán online (VNPay/MoMo) · custom domain · analytics · đa ngôn ngữ.

---

## 5. Schema dữ liệu (Directus collections)

> Dùng `directus_users` cho tài khoản nhân viên. `directus_files` cho ảnh/QR/nhạc. M2O = many-to-one, O2M = one-to-many.
> Script dựng: `directus/bootstrap-schema.mjs`

### 5.1 `template_categories`

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| name | string | "Truyền thống", "Thiên nhiên"… |
| slug | string (unique) | |
| sort | integer | |

### 5.2 `templates` — mẫu thiệp

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| name | string | Tên hiển thị cho khách — "Hồng Pastel" |
| slug | string (unique) | Dùng cho URL `/mau/{slug}` |
| description | text | mô tả marketing |
| category | M2O → template_categories | |
| thumbnail | M2O → directus_files | **Tùy chọn.** Không có thì frontend dùng ảnh tĩnh `web/public/thumbs/{component_key}.jpg` |
| component_key | string | **Khoá kỹ thuật**, map tới React component trong `registry.ts`. Không lộ cho khách |
| style_tokens | json | dự phòng, chưa dùng |
| default_sections | json | dự phòng, chưa dùng |
| badge | enum(none/hot/new) | nhãn Hot/New |
| is_active | boolean | đang mở bán — Public chỉ đọc bản `true` |
| sort | integer | |
| price | integer | giá tham khảo (VND) |
| **demo_slug** | string | **(bổ sung v3)** slug của một `invitation_variants` dùng làm nội dung cho trang xem trước. Trống thì rơi về dữ liệu mẫu trong code |

> **Ba định danh, đừng lẫn**: `name` (khách thấy) · `slug` (URL) · `component_key` (chỉ code, cũng là tên file ảnh thumbnail).

### 5.3 `briefs` — form thu thập thông tin

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| contact_name / contact_phone / contact_channel | string | thông tin liên hệ |
| **contact_email** | string | **(v4)** email, không bắt buộc — popup "Nhận tư vấn" có hỏi |
| **source** | string(intake/consult) | **(v4)** `intake` = form đặt thiệp đầy đủ · `consult` = popup nhận tư vấn. Hai loại khách cần cách chăm sóc khác nhau |
| template | M2O → templates | mẫu khách chọn |
| groom_name / bride_name | string | |
| event_info | text | ngày giờ, địa điểm (khách mô tả tự do) |
| wish | text | lời nhắn / yêu cầu riêng |
| status | enum(new/in_progress/quoted/paid/delivered/canceled) | **Public không được ghi field này** |
| invitation | M2O → invitations | thiệp nhân viên dựng từ brief |
| date_created | timestamp (date-created) | |

### 5.4 `brief_photos`

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| brief | M2O → briefs (cascade) | |
| image | M2O → directus_files | |
| sort | integer | |

### 5.5 `invitations` — thiệp (bảng lõi)

| Field | Kiểu | Public đọc? |
| --- | --- | --- |
| id | uuid (PK) | ✅ |
| owner | M2O → directus_users | ❌ nhân viên phụ trách |
| template | M2O → templates | ✅ |
| status | enum(draft/review/approved/published/archived) | ✅ |
| groom_name / groom_full_name / groom_father / groom_mother | string | ✅ |
| bride_name / bride_full_name / bride_father / bride_mother | string | ✅ |
| cover_photo / couple_photo | M2O → directus_files | ✅ |
| love_story | text | ✅ |
| settings | json | ✅ nhạc, hiệu ứng, đếm ngược |
| published_at | timestamp | ✅ |
| date_created / date_updated | timestamp | ❌ |
| **client_user** | M2O → directus_users | ❌ **(v4)** tài khoản cặp đôi được xem trang theo dõi khách mời. Là sợi dây duy nhất mà toàn bộ phân quyền "Chủ thiệp" dựa vào |

### 5.6 `invitation_variants` — 3 biến thể link

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| invitation | M2O → invitations (cascade) | |
| variant_type | enum(combined/groom/bride) | |
| slug | string (unique) | URL public. Nên không dấu, chữ thường: `phuc-hanh`, `phuc-hanh-nha-trai` |
| display_config | json | section nào hiển thị *(renderer chưa dùng)* |

### 5.7 `events` — mốc lễ / tiệc

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| invitation | M2O → invitations (cascade) | |
| event_type | enum(le_vu_quy/le_tan_hon/le_thanh_hon/tiec_cuoi) | |
| title | string | |
| event_at | timestamp | đổi tên từ `datetime` để tránh từ khóa SQL |
| venue_name | string | |
| address | text | |
| map_lat / map_lng | float | |
| map_url | string | |
| side | enum(groom/bride/both) | |
| sort | integer | |

### 5.8 `photos` — album

| Field | Kiểu |
| --- | --- |
| id | uuid (PK) |
| invitation | M2O → invitations (cascade) |
| image | M2O → directus_files |
| caption | string |
| sort | integer |

### 5.9 `guests` — khách mời

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| invitation | M2O → invitations (cascade) | |
| name / salutation | string | |
| side | enum(groom/bride/both) | |
| tag | string | nhóm khách |
| token | string (unique) | dùng cho link `?g=` |
| phone | string | **nhạy cảm — Public không đọc được collection này** |
| note | text | **nhạy cảm** |

### 5.10 `rsvps`

| Field | Kiểu |
| --- | --- |
| id | uuid (PK) |
| invitation | M2O → invitations (cascade) |
| guest | M2O → guests (set null) |
| name | string |
| attending | enum(yes/no/maybe) |
| num_guests | integer |
| side | enum(groom/bride) |
| message | text |
| date_created | timestamp (date-created) |

### 5.11 `guestbook`

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| invitation | M2O → invitations (cascade) | |
| guest | M2O → guests (set null) | |
| name | string | |
| message | text | |
| status | enum(pending/approved) | **Public không được ghi**; chỉ đọc được bản `approved` |
| date_created | timestamp (date-created) | |

### 5.12 `gift_accounts` — mừng cưới QR

| Field | Kiểu |
| --- | --- |
| id | uuid (PK) |
| invitation | M2O → invitations (cascade) |
| side | enum(groom/bride) |
| bank_name / account_number / account_holder | string |
| qr_image | M2O → directus_files |

### 5.13 `orders` — theo dõi thu tiền

| Field | Kiểu | Ghi chú |
| --- | --- | --- |
| id | uuid (PK) | |
| invitation | M2O → invitations (set null) | |
| brief | M2O → briefs (set null) | |
| amount | integer | VND |
| status | enum(pending/paid/canceled) | |
| method | string | chuyển khoản / tiền mặt |
| paid_at | timestamp | |
| note | text | |
| date_created | timestamp (date-created) | |

> **Public không có bất kỳ quyền nào** trên collection này.

### 5.14 `invitation_views` — analytics (tùy chọn)

| Field | Kiểu |
| --- | --- |
| id | uuid (PK) |
| invitation | M2O → invitations (cascade) |
| variant | M2O → invitation_variants (cascade) |
| guest | M2O → guests (set null) |
| date_created | timestamp (date-created) |
| user_agent | string |

### Quan hệ chính

```
templates ─* briefs ─* brief_photos
briefs 1─ invitation
directus_users ─* invitations ─* {events, photos, guests, rsvps, guestbook, gift_accounts, variants, views}
invitations ─* orders *─ briefs
```

**Alias O2M** (script `add-o2m-aliases.mjs`): mở một `invitation` trong admin sẽ thấy tab con **events / photos / guests / gift_accounts / variants** ngay trong trang; `briefs` có tab **photos**. Đây chỉ là tiện ích giao diện, không đổi schema.

---

## 6. Phân quyền Public (đã áp dụng)

> Directus 11 dùng **Access Policies**, không phải Role. Quyền Public nằm ở policy gắn với bản ghi `directus_access` có `role = null` và `user = null`.
> Script áp dụng: `directus/setup-permissions.mjs` · Script kiểm tra: `directus/audit-permissions.mjs`

### 6.1 Bảng quyền đầy đủ — 13 dòng

| Collection | Action | Field | Điều kiện lọc |
| --- | --- | --- | --- |
| `briefs` | create | `contact_name, contact_phone, contact_channel, template, groom_name, bride_name, event_info, wish` | — |
| `brief_photos` | create | `brief, image, sort` | — |
| `rsvps` | create | `invitation, guest, name, attending, num_guests, side, message` | — |
| `guestbook` | create | `invitation, guest, name, message` | — · **preset `status = approved`** |
| `guestbook` | read | `id, invitation, name, message, date_created` | `status = approved` |
| `templates` | read | `*` | `is_active = true` |
| `template_categories` | read | `*` | — |
| `invitations` | read | 16 field an toàn *(xem 6.2)* | `status = published` |
| `invitation_variants` | read | `*` | `invitation.status = published` |
| `events` | read | `*` | `invitation.status = published` |
| `photos` | read | `*` | `invitation.status = published` |
| `gift_accounts` | read | `*` | `invitation.status = published` |
| `directus_files` | read | `id, filename_download, title, description, type, width, height` | `folder = Public` |

### 6.2 Field `invitations` mà Public đọc được

```
id, template, status, published_at,
groom_name, groom_full_name, groom_father, groom_mother,
bride_name, bride_full_name, bride_father, bride_mother,
cover_photo, couple_photo, love_story, settings
```

Cố tình loại: `owner` (lộ id nhân viên), `date_created`, `date_updated`.

### 6.3 Tuyệt đối không cấp cho Public

`orders` · `guests` · `invitation_views` · `directus_users` · mọi quyền **read/update/delete** trên `briefs` và `brief_photos`.

### 6.4 Ba điểm dễ sai

**`directus_files` là bắt buộc.** Directus phục vụ ảnh qua `/assets/<id>` và **kiểm tra quyền read trên bản ghi file**. Không cấp thì mọi ảnh 403, thiệp trắng trơn dù dữ liệu đúng hết. Nhưng cấp không lọc thì `GET /files` **liệt kê toàn bộ file** — ảnh khách khác, thiệp draft, QR ngân hàng. Vì vậy phải lọc theo folder.

**Folder `Public` là folder upload mặc định** (`directus_settings.storage_default_folder`). Nhờ vậy nhân viên upload bình thường là ảnh tự vào đúng chỗ. Chiều thất bại được đảo ngược: quên thao tác thì ảnh vẫn hiện, chỉ dữ liệu nhạy cảm mới cần chủ động đặt ra ngoài folder này.

**Dùng `presets` thay vì trông chờ giá trị mặc định.** `guestbook.create` không cho khách ghi field `status` (dễ tự duyệt bài spam), nhưng nếu default của bảng là `pending` thì tường lời chúc sẽ trống trơn mãi mãi. `presets: { status: 'approved' }` bắt Directus tự gán — chắc chắn, không phụ thuộc schema.

**Giới hạn field khi ghi, không chỉ khi đọc.** Nếu `briefs.create` để `fields: *`, bất kỳ ai cũng `POST /items/briefs` với `status: "paid"`. Whitelist field ghi mới chặn được.

### 6.5 Cách kiểm tra

```powershell
node --env-file=.env directus/audit-permissions.mjs   # chỉ đọc, in báo cáo
curl.exe -i "http://localhost:8055/items/briefs"      # phải 403
curl.exe -i "http://localhost:8055/items/invitations" # chỉ được thấy bản published
```

---

## 6b. Tài khoản "Chủ thiệp" *(mới ở v4)*

Cặp đôi khách hàng có một tài khoản để **tự xem** ai đã xác nhận tham dự và đọc lời chúc, thay vì phải nhắn hỏi nhân viên.

> Script: `add-client-user-field.mjs` → `setup-client-role.mjs` → `create-client-account.mjs`
> Trang: `/quan-ly`

### 6b.1 Vì sao dùng tài khoản, không dùng link bí mật

Phương án đầu tiên là link kèm mã bí mật `?key=…`. Đã loại vì **mã phải được kiểm ở server mới có nghĩa** — kiểm ở trình duyệt thì ai gọi thẳng API cũng lấy được dữ liệu. Muốn kiểm ở server phải dựng Directus Flow, tức là một cỗ máy mới.

Trong khi đó Directus có sẵn bộ lọc `$CURRENT_USER` — **đúng công cụ đã dùng và đã kiểm chứng** ở mục 6. Chọn đăng nhập vừa ít việc hơn, vừa là nền móng sẵn cho mô hình A ở P8.

**Tài khoản do HVN tạo, không cho khách tự đăng ký.** Tự đăng ký không giải quyết được việc nối tài khoản với thiệp — vẫn phải có mã nhận thiệp, tức là thêm việc chứ không bớt. Mở quyền tạo `directus_users` cho Public cũng là mở cửa cho bot.

### 6b.2 Bảng quyền — 7 dòng

Ba bộ lọc dùng lại nhiều lần:

```js
MINE                 = { client_user: { _eq: '$CURRENT_USER' } }
MINE_VIA_INVITATION  = { invitation: { client_user: { _eq: '$CURRENT_USER' } } }
ME                   = { id: { _eq: '$CURRENT_USER' } }
```

| Collection | Action | Field | Điều kiện lọc |
| --- | --- | --- | --- |
| `invitations` | read | 10 field nội dung | `MINE` |
| `invitation_variants` | read | `id, variant_type, slug` | `MINE_VIA_INVITATION` |
| `events` | read | `*` | `MINE_VIA_INVITATION` |
| `rsvps` | read | `id, name, attending, num_guests, side, message, date_created` | `MINE_VIA_INVITATION` |
| `guestbook` | read | `id, name, message, status, date_created` | `MINE_VIA_INVITATION` |
| `directus_users` | read | `id, first_name, last_name, email` | `ME` |
| `directus_users` | update | **chỉ** `password, first_name, last_name` | `ME` |

Policy đặt `admin_access: false` và **`app_access: false`** — khách đăng nhập được qua API nhưng **không vào được giao diện admin Directus**.

### 6b.3 Ba lời hứa với khách và cấu hình tương ứng

Đây là những câu nhân viên nói với khách khi bàn giao. Mỗi câu ràng buộc một phần cấu hình — sửa cấu hình mà quên đối chiếu là **nói sai với khách hàng**.

| Nói với khách | Ràng buộc kỹ thuật |
| --- | --- |
| "Chỉ xem được thiệp của anh chị" | Mọi dòng `read` đều phải có bộ lọc, không dòng nào để trống |
| "Không sửa hay xoá được gì" | 5 bảng dữ liệu **chỉ có `read`** — không `create`/`update`/`delete` |
| "Đổi được mật khẩu" | `directus_users.update` phải tồn tại, nhưng **tuyệt đối không được có `role`, `policies`, `email`, `status`** trong danh sách field — có là khách tự nâng mình lên admin |

Nếu khách hỏi *"bên bạn có xem được không?"* — trả lời **có**, vì HVN là bên dựng thiệp. Nói khác đi là nói dối, và khách tinh ý sẽ nhận ra.

### 6b.4 Cách kiểm chứng

```powershell
$body = '{"email":"<email khách>","password":"<mật khẩu>"}'
$r = Invoke-RestMethod -Uri "http://localhost:8055/auth/login" -Method Post -ContentType "application/json" -Body $body
$tk = $r.data.access_token

curl.exe -s "http://localhost:8055/items/rsvps" -H "Authorization: Bearer $tk"        # chỉ thiệp của mình
curl.exe -s -i "http://localhost:8055/items/briefs" -H "Authorization: Bearer $tk"    # phải 403
```

Tạo hai tài khoản cho hai thiệp khác nhau rồi đối chiếu chéo là cách chắc nhất.

### 6b.5 Trang `/quan-ly` có gì

Bốn ô thống kê (lượt xác nhận · tổng số người · báo không đến · lời chúc) · link thiệp kèm nút chép · bảng khách xác nhận tách theo nhà trai/nhà gái · bảng khách báo không đến · tường lời chúc · **nút tải danh sách ra Excel** · đổi mật khẩu · đăng xuất.

Frontend **không truyền id thiệp** khi gọi API — gọi trần và để server tự lọc. Nhờ vậy lỗi ở frontend cũng không làm lộ dữ liệu người khác.

> `num_guests = 0` vẫn được tính là **1 người**: khách quên điền thì vẫn phải có chỗ ngồi. Con số trên trang và trong file Excel dùng chung quy tắc này.

---

## 7. Kiến trúc & triển khai

```
Nginx/Caddy/Coolify
  ├── tenmien.vn      → React static build (thư viện mẫu + intake + renderer)
  └── api.tenmien.vn  → Directus → PostgreSQL + volume uploads
```

### 7.1 Biến môi trường phải đổi khi deploy

| Biến | Ở đâu | Ghi chú |
| --- | --- | --- |
| `VITE_DIRECTUS_URL` | `web/.env` | **Nhúng lúc build**, không phải runtime — đổi xong phải build lại |
| `CORS_ORIGIN` | `.env` gốc | Phải khớp domain frontend, sai là trình duyệt chặn hết |
| `PUBLIC_URL` | `.env` gốc | URL của chính Directus |
| `DIRECTUS_KEY` / `DIRECTUS_SECRET` | `.env` gốc | Sinh ngẫu nhiên riêng cho production |
| `DB_PASSWORD`, `ADMIN_PASSWORD` | `.env` gốc | Đổi khác local |

> `CORS_ORIGIN` cũng ảnh hưởng script chụp thumbnail — script chạy `vite preview` đúng cổng khai báo trong biến này.

Biến cho ảnh (có mặc định trong `docker-compose.yml`, chỉ khai khi muốn đổi):

| Biến | Mặc định | Để làm gì |
| --- | --- | --- |
| `ASSETS_TRANSFORM_MAX_CONCURRENT` | 4 | Số lượt resize song song. VPS 1 core nên hạ về 2 |
| `ASSETS_TRANSFORM_MAX_OPERATIONS` | 5 | Số phép biến đổi trên một ảnh |
| `ASSETS_TRANSFORM_IMAGE_MAX_DIMENSION` | 6000 | Chặn ảnh quá khổ |
| `ASSETS_CACHE_TTL` | 30d | Cache ở trình duyệt và CDN |

> Không có các giới hạn này, người lạ gọi `?width=1`, `?width=2`… hàng nghìn lần sẽ ép server resize liên tục và **làm đầy ổ đĩa bằng file cache rác**.

### 7.4 Chạy script quản trị trỏ lên VPS

Script nói chuyện với Directus **qua HTTP**, nên **không cần cài Node trên VPS**. Tạo `.env.production` **trên máy làm việc** (không phải trên server):

```
DIRECTUS_URL=https://api.tenmien.vn
ADMIN_EMAIL=admin@tenmien.vn
ADMIN_PASSWORD=…
SITE_URL=https://tenmien.vn
```

```powershell
node --env-file=.env.production directus/audit-permissions.mjs
```

Cùng một script, hai môi trường — code không đổi một dòng. `.gitignore` chặn cả `.env.*` nên file này không lọt lên Git.

> Trên VPS dùng Coolify thì biến môi trường khai **trong giao diện Coolify**, không có file `.env` nào trên server. `.env.production` chỉ là "điều khiển từ xa" nằm ở máy anh.

### 7.2 Volume bắt buộc persistent

- `directus/uploads` — **mất là mất sạch ảnh cưới của khách**
- `data/` (Postgres)

### 7.3 Directus Flows (chưa làm)

(1) thông báo khi có `brief` mới · (2) sinh 3 `invitation_variants` khi `status → published` · (3) thông báo khi có `rsvp` mới.

---

## 8. Kiến trúc renderer *(mới ở v3)*

Bản v2 ghi "mỗi mẫu là 1 React component riêng". Thực tế đã đi xa hơn và tốt hơn nhiều.

### 8.1 Một BaseTemplate + nhiều theme

```
BaseTemplate.tsx  (≈200 dòng, dùng chung cho MỌI mẫu)
       ↑
   theme object  ← themes.ts
       ↑
HongPastel01.tsx  (7 dòng: <BaseTemplate theme={pinkTheme} />)
```

Thêm một mẫu mới = thêm một object theme + wrapper 7 dòng. **Không đụng `BaseTemplate.tsx`, không đụng CSS.**

### 8.2 Theme điều khiển cả màu lẫn bố cục

| Nhóm | Thuộc tính |
| --- | --- |
| Màu | `bg, cream, primary, primarySoft, deep, text, muted, line, heroOverlay` |
| Chữ | `heading, body` — **chỉ dùng font có subset Vietnamese**, nếu không dấu tiếng Việt sẽ vỡ |
| Trang trí | `motif` (♥ 囍 ❦ ✦ ❀ ❧), `eyebrow` |
| **Bố cục** | `heroVariant`: `cover` / `split` / `minimal` |
| **Bố cục** | `eventsVariant`: `cards` / `timeline` |
| **Bố cục** | `order`: thứ tự các section giữa hero và footer |

Ba thuộc tính bố cục cuối là thứ khiến các mẫu khác nhau thật sự, chứ không chỉ đổi màu.

### 8.3 Sáu mẫu hiện có

| component_key | Tông | heroVariant | eventsVariant |
| --- | --- | --- | --- |
| `hong-pastel-01` | Hồng sen | cover | cards |
| `do-truyen-thong-01` | Đỏ son | cover | timeline |
| `xanh-thien-nhien-01` | Xanh lá | split | cards |
| `kem-gold-01` | Kem vàng | minimal | timeline |
| `tim-lavender-01` | Tím oải hương | split | timeline |
| `burgundy-vintage-01` | Đỏ rượu vang | minimal | cards |

**Sáu tổ hợp bố cục đã dùng hết.** Mẫu thứ 7 trở đi mà chỉ đổi màu thì sẽ trông na ná nhau — lúc đó cần bổ sung `heroVariant` / `eventsVariant` mới vào `BaseTemplate` và CSS.

> ⚠️ `.hp-hero` đặt `place-items: center`. Bất kỳ hero variant nào chia cột đều **phải ghi đè `place-items: stretch`**, nếu không cột không có nội dung sẽ co về width 0 và biến mất. Đây là lỗi đã từng xảy ra với `split`.

### 8.4 Ảnh preview mẫu

Sinh tự động bằng `web/tools/gen-thumbnails.mjs` — chụp Chromium ở đúng trang `/mau/{slug}`, tức là **chính thứ khách sẽ thấy**. Kết quả: `web/public/thumbs/{component_key}.jpg`, 900×1200 (3:4), JPEG q80.

Thứ tự ưu tiên ảnh ở trang thư viện: `templates.thumbnail` (Directus) → ảnh tĩnh → ô chữ placeholder.

### 8.6 Kích thước ảnh *(mới ở v4)*

Directus resize ảnh theo tham số trên URL rồi cache lại. **Không truyền tham số thì nó trả ảnh gốc** — ảnh 4000×3000 nặng 3MB từ điện thoại khách được gửi nguyên xi rồi trình duyệt mới thu nhỏ về ô 200px.

| | Không preset | Có preset |
| --- | --- | --- |
| 1 ảnh album | ~3MB | ~50KB |
| Album 100 ảnh | **~300MB** | ~5MB |

Năm preset trong `web/src/lib/directus.ts`:

| Preset | Dùng ở đâu | Kích thước |
| --- | --- | --- |
| `album` | Khoảnh khắc | 600×750 cắt 3:4 |
| `cover` | Ảnh bìa tràn viền | rộng 1600 |
| `coverSplit` | Ảnh bìa mẫu chia đôi | rộng 1000 |
| `qr` | QR mừng cưới | rộng 420 |
| `card` | Ảnh mẫu ở thư viện | 600×800 cắt 3:4 |

Ba tham số dùng chung: `format=auto` (WebP nếu trình duyệt hỗ trợ, không thì JPEG), `quality=80`, `withoutEnlargement=true` (ảnh gốc nhỏ hơn preset thì giữ nguyên).

> Preset chỉ giảm **băng thông**, không giảm **dung lượng đĩa** — Directus vẫn giữ ảnh gốc. Muốn tiết kiệm đĩa thì phải nén trước khi upload. Ước lượng: 100 ảnh/thiệp ≈ 300MB, VPS 40–80GB chứa được khoảng 80–150 thiệp.

### 8.5 Route

| URL | Trang | Cần Directus? |
| --- | --- | --- |
| `/` | Thư viện mẫu | ✅ |
| `/mau/:slug` | Xem trước mẫu | ✅ |
| `/dat-thiep` | Form intake | ✅ |
| `/kho-mau-thiep`, `/goi-dich-vu`, `/lien-he` | Trang bán hàng | một phần |
| `/quan-ly` | **(v4)** Trang theo dõi khách mời của cặp đôi — cần đăng nhập | ✅ |
| `/:slug` | Thiệp thật (chỉ `published`) | ✅ |
| `/demo`, `/_thumb/:key` | Render bằng dữ liệu mẫu trong code | ❌ |

---

## 9. Script vận hành *(mới ở v3)*

Chạy từ thư mục gốc, Directus phải đang bật. **Tất cả đều idempotent.**

| Script | Việc | Ghi vào Directus? |
| --- | --- | --- |
| `bootstrap-schema.mjs` | Dựng 14 collections + relations | ✅ |
| `seed-templates.mjs` | Nạp danh mục mẫu từ `templates.json`. Cờ `--update` đồng bộ cả mẫu đã có, `--dry-run` xem trước | ✅ |
| `export-templates.mjs` | Kéo ngược danh mục mẫu từ Directus về `templates.json` | ❌ chỉ ghi file |
| `add-o2m-aliases.mjs` | Gom quan hệ con vào trang cha trong admin | ✅ |
| `setup-permissions.mjs` | Siết quyền Public. Tự sao lưu trước khi ghi; có `--dry-run` và `--restore` | ✅ |
| `audit-permissions.mjs` | Soi quyền Public, chấm điểm theo mục 6 | ❌ |
| `add-brief-fields.mjs` | Thêm `contact_email` + `source` cho `briefs` | ✅ |
| `add-client-user-field.mjs` | Thêm `client_user` cho `invitations` | ✅ |
| `setup-client-role.mjs` | Dựng role + policy "Chủ thiệp" (mục 6b). Có `--dry-run` | ✅ |
| `create-client-account.mjs` | Tạo tài khoản cho cặp đôi, in sẵn tin nhắn Zalo. Có `--reset`, `--dry-run` | ✅ |
| `web/tools/gen-thumbnails.mjs` | Chụp ảnh preview 6 mẫu (`npm run thumbs`) | ❌ chỉ ghi ảnh |

### Thứ tự dựng hệ thống từ đầu (dùng cho VPS)

```powershell
docker compose up -d                                  # chờ ~20 giây
node --env-file=.env directus/bootstrap-schema.mjs
node --env-file=.env directus/seed-templates.mjs
node --env-file=.env directus/add-o2m-aliases.mjs
node --env-file=.env directus/setup-permissions.mjs
node --env-file=.env directus/audit-permissions.mjs   # xác nhận
```

### `directus/templates.json` — nguồn sự thật của danh mục mẫu

Sửa tên/mô tả mẫu trong admin xong thì **kéo về file và commit**, để VPS không lệch với local:

```powershell
node --env-file=.env directus/export-templates.mjs        # Directus → file
git diff directus/templates.json                          # soát lại
node --env-file=.env directus/seed-templates.mjs --update # file → Directus
```

---

## 10. Lộ trình

| Phase | Mục tiêu | Trạng thái |
| --- | --- | --- |
| **P0 — Setup** | docker-compose, Vite, SDK | ✅ |
| **P1 — Data model** | 14 collections + **phân quyền mục 6** | ✅ |
| **P2 — Renderer** | BaseTemplate + theme, responsive, đếm ngược, map | ✅ |
| **P3 — Thư viện mẫu** | Trang list + xem trước + ảnh preview tự sinh | ✅ |
| **P4 — Form intake** | Form public ghi `briefs` | ✅ |
| **P5 — Vận hành** | Alias O2M ✅ · workflow trạng thái, `orders`, dựng thiệp end-to-end ⬜ | 🔄 |
| **P6 — Tương tác khách mời** | RSVP ✅ · lưu bút (UI) ⬜ | 🔄 |
| **P7 — Nâng cao** | 3 link, cá nhân hoá khách, nhạc, hiệu ứng, SEO/OG | ⬜ |
| **P8 — Hybrid→A** | Tài khoản chủ thiệp, thanh toán online | ⬜ |

---

## 11. Quyết định & giả định

1. **Frontend**: 1 app React, tách route thư viện/intake và renderer. ✅
2. **Renderer**: ~~mỗi mẫu 1 component riêng~~ → **một `BaseTemplate` + theme**, mỗi mẫu chỉ là wrapper 7 dòng. Sửa ở v3, xem mục 8.
3. **URL**: path `/{slug}` (subdomain để giai đoạn sau). ✅
4. **ID**: `uuid` cho các bảng public-facing. ✅
5. **Ảnh khách gửi**: ~~upload trực tiếp trong form intake~~ → **khách gửi qua Zalo, nhân viên upload**. An toàn hơn, không mở quyền ghi file cho public. Quyền `brief_photos.create` đã cấp sẵn cho khi làm tính năng upload.
6. **Thanh toán (B)**: thủ công — chuyển khoản, nhân viên đối chiếu và cập nhật `orders`.
7. **Cấu hình Directus**: **script hoá toàn bộ**, không phụ thuộc thao tác tay. Lý do: `directus schema snapshot` **không mang theo roles/policies/permissions**, nên nếu không viết script thì phân quyền sẽ phải bấm lại từ đầu trên VPS mà không có gì đối chiếu.
8. **Font**: chỉ dùng font Google có subset Vietnamese. Hiện dùng Playfair Display, Cormorant Garamond, Lora (tiêu đề) + Be Vietnam Pro (nội dung).

---

## 12. Việc còn nợ đã biết *(mới ở v3)*

| # | Việc | Ảnh hưởng |
| --- | --- | --- |
| 1 | **Link cho khách duyệt khi `status = review`** — renderer vẫn chỉ đọc `published`. Nhưng từ v4 đã có tài khoản "Chủ thiệp", nên hướng gọn nhất là cho policy đó đọc thêm bản `review` của chính mình | Nghiệp vụ: hiện phải publish sớm mới cho khách xem được |
| 2 | `orders` chưa có quy trình vận hành | Chưa theo dõi được thu tiền |
| 3 | ~~Lưu bút chưa có UI~~ → **đã làm ở v4** (tường lời chúc dưới form RSVP) | — |
| 4 | 3 link variant + `display_config` chưa được renderer dùng | P7 |
| 5 | Cá nhân hoá `?g={token}` chưa làm | P7 |
| 6 | SEO/OG cho từng link — share Zalo/Facebook chưa có ảnh và mô tả riêng | P7, ảnh hưởng trực tiếp tới cảm nhận của khách |
| 7 | `invitation_views` chưa ghi nhận | Analytics |
| 8 | Directus Flows thông báo brief/RSVP mới | Vận hành thủ công |
| 9 | Tài liệu deploy Coolify | Viết khi chốt tên miền |
| 10 | Moderation lưu bút: hiện mọi lời chúc tự `approved`. Gặp spam thì phải đổi preset sang `pending` và làm chỗ duyệt trong admin | Chưa cấp bách, nhưng nên biết trước |
| 11 | Quên mật khẩu cho tài khoản "Chủ thiệp" phải nhờ nhân viên đặt lại (`--reset`). Tự phục vụ cần cấu hình SMTP | Chấp nhận được ở quy mô vài chục khách |
