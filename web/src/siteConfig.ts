// ============================================================
//  Nội dung trang bán hàng — SỬA Ở ĐÂY, không phải sửa trong component.
//  Toàn bộ chữ nghĩa của header, hero, trang chủ, footer nằm trong file này.
// ============================================================

export const site = {
  brandName: 'Thiệp Cưới Online',
  phone: '0943135869',
  phoneDisplay: '094 313 58 69',
  zaloUrl: 'https://zalo.me/0943135869',
  facebookUrl: '', // để trống thì không hiện
  email: '',
  address: '',
}

export const nav = [
  { label: 'Trang chủ', to: '/' },
  { label: 'Kho mẫu thiệp', to: '/kho-mau-thiep' },
  { label: 'Gói dịch vụ', to: '/goi-dich-vu' },
  { label: 'Liên hệ', to: '/lien-he' },
  // { label: 'Tin tức', to: '/tin-tuc' },  ← mở lại khi có nội dung
]

export const hero = {
  image: '/hero/banner-1.jpg',
  eyebrow: 'Thiệp mời cưới điện tử',
  title: 'Thiệp Cưới Online',
  subtitle:
    'Gửi lời mời trọn vẹn chỉ bằng một đường link. Thiệp được thiết kế riêng theo câu chuyện của hai bạn, đẹp trên mọi màn hình, khách mời xác nhận tham dự ngay trên thiệp.',
  primaryCta: { label: 'Xem kho mẫu thiệp', to: '/kho-mau-thiep' },
  // Nút này mở popup nhận tư vấn, không điều hướng sang trang khác.
  secondaryCta: { label: 'Nhận tư vấn' },
}

export const valueProps = [
  {
    title: 'Thiết kế riêng cho hai bạn',
    desc: 'Không dùng khuôn cứng. Chúng tôi nhận thông tin, dựng thiệp và tinh chỉnh đến khi hai bạn thật sự ưng ý.',
  },
  {
    title: 'Đẹp trên điện thoại',
    desc: 'Phần lớn khách mời mở thiệp bằng điện thoại. Mọi mẫu đều được dựng ưu tiên màn hình dọc trước.',
  },
  {
    title: 'Khách mời phản hồi ngay',
    desc: 'Xác nhận tham dự, gửi lời chúc, xem bản đồ, mừng cưới qua QR — tất cả nằm gọn trong một trang.',
  },
  {
    title: 'Đồng hành tới ngày cưới',
    desc: 'Cần sửa giờ lễ, đổi ảnh, thêm khách mời? Nhắn một câu là xong, không giới hạn số lần chỉnh.',
  },
]

export const steps = [
  { no: '01', title: 'Chọn mẫu', desc: 'Xem thử trực tiếp từng mẫu trong kho, chọn phong cách hợp với hai bạn.' },
  { no: '02', title: 'Gửi thông tin', desc: 'Điền form đặt thiệp và gửi ảnh cưới qua Zalo. Chúng tôi lo phần còn lại.' },
  { no: '03', title: 'Duyệt bản xem trước', desc: 'Nhận link xem trước, góp ý thoải mái đến khi hoàn thiện.' },
  { no: '04', title: 'Nhận link chính thức', desc: 'Bàn giao link thiệp để hai bạn gửi cho khách mời qua Zalo, Facebook.' },
]

export const finalCta = {
  title: 'Sẵn sàng gửi lời mời đầu tiên?',
  desc: 'Để lại thông tin, chúng tôi liên hệ tư vấn và dựng bản xem trước miễn phí.',
  cta: { label: 'Nhận tư vấn' },
}
