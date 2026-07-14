import { Link, useSearchParams } from 'react-router-dom'
import './gallery.css'

// Placeholder cho form đặt thiệp (intake) — sẽ hoàn thiện ở P4.
export default function OrderPlaceholder() {
  const [params] = useSearchParams()
  const mau = params.get('mau')

  return (
    <div className="gl-order">
      <div className="gl-order-card">
        <p className="gl-eyebrow">Đặt thiệp</p>
        <h1 className="gl-order-title">Cảm ơn bạn đã chọn mẫu ♥</h1>
        {mau && (
          <p className="gl-order-mau">
            Mẫu đã chọn: <strong>{mau}</strong>
          </p>
        )}
        <p className="gl-order-note">
          Form thu thập thông tin (tên cô dâu chú rể, ngày giờ lễ tiệc, ảnh cưới…) đang được hoàn thiện. Bước tiếp theo (P4)
          sẽ cho phép bạn gửi thông tin trực tiếp tại đây.
        </p>
        <Link className="tp-cta" to="/">
          ← Quay lại thư viện mẫu
        </Link>
      </div>
    </div>
  )
}
