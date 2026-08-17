import { site } from '../siteConfig'
import { useConsult } from '../components/ConsultModal'
import './gallery.css'

export default function ContactPage() {
  const consult = useConsult()
  return (
    <div className="gl">
      <header className="page-head">
        <p className="sec-eyebrow">Liên hệ</p>
        <h1 className="page-title">Nói chuyện với chúng tôi</h1>
        <p className="page-lead">
          Hai bạn cứ nhắn bất cứ lúc nào - kể cả khi chưa chốt mẫu, chưa có ngày cưới chính xác. Chúng tôi tư vấn trước, không tính phí.
        </p>
      </header>

      <div className="ct-grid">
        <a className="ct-card" href={`tel:${site.phone}`}>
          <p className="ct-label">Điện thoại</p>
          <p className="ct-value ct-value-num">{site.phoneDisplay}</p>
          <p className="ct-note">Gọi trực tiếp, nhanh nhất</p>
        </a>

        <a className="ct-card" href={site.zaloUrl} target="_blank" rel="noreferrer">
          <p className="ct-label">Zalo</p>
          <p className="ct-value ct-value-num">{site.phoneDisplay}</p>
          <p className="ct-note">Tiện gửi ảnh cưới và trao đổi</p>
        </a>

        <button className="ct-card ct-card-accent" onClick={consult.open}>
          <p className="ct-label">Nhận tư vấn</p>
          <p className="ct-value">Gửi thông tin</p>
          <p className="ct-note">Để lại số, chúng tôi gọi lại cho hai bạn</p>
        </button>
      </div>
    </div>
  )
}
