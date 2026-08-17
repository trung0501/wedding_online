import { Link } from 'react-router-dom'
import { site } from '../siteConfig'
import { useConsult } from '../components/ConsultModal'
import './gallery.css'

// Khung sẵn cho trang Gói dịch vụ — nội dung và bảng giá điền sau.
export default function ServicesPage() {
  const consult = useConsult()
  return (
    <div className="gl">
      <header className="page-head">
        <p className="sec-eyebrow">Gói dịch vụ</p>
        <h1 className="page-title">Bảng giá &amp; gói dịch vụ</h1>
        <p className="page-lead">
          Chúng tôi đang hoàn thiện bảng giá chi tiết. Trong lúc chờ, hai bạn cứ liên hệ trực tiếp - mỗi thiệp một yêu cầu riêng, báo giá theo đúng nhu cầu sẽ sát hơn.
        </p>
      </header>

      <div className="placeholder-box">
        <p className="placeholder-title">Nội dung đang được biên soạn</p>
        <p className="placeholder-desc">
          Gọi <a href={`tel:${site.phone}`}>{site.phoneDisplay}</a> hoặc nhắn{' '}
          <a href={site.zaloUrl} target="_blank" rel="noreferrer">
            Zalo
          </a>{' '}
          để được tư vấn ngay.
        </p>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={consult.open}>
            Nhận tư vấn
          </button>
          <Link className="btn btn-outline" to="/kho-mau-thiep">
            Xem kho mẫu
          </Link>
        </div>
      </div>
    </div>
  )
}
