import { Link } from 'react-router-dom'
import { site, nav } from '../siteConfig'

export default function SiteFooter() {
  return (
    <footer className="sf">
      <div className="sf-inner">
        <div className="sf-col">
          <p className="sf-brand">{site.brandName}</p>
          <p className="sf-desc">
            Dịch vụ thiết kế thiệp mời cưới điện tử. Nhận thông tin, dựng thiệp, bàn giao link - đồng hành cùng hai bạn tới ngày trọng đại.
          </p>
        </div>

        <div className="sf-col">
          <p className="sf-heading">Liên kết</p>
          <ul className="sf-list">
            {nav.map((item) => (
              <li key={item.to}>
                <Link to={item.to}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="sf-col">
          <p className="sf-heading">Liên hệ</p>
          <ul className="sf-list">
            <li>
              <a href={`tel:${site.phone}`}>{site.phoneDisplay}</a>
            </li>
            {site.zaloUrl && (
              <li>
                <a href={site.zaloUrl} target="_blank" rel="noreferrer">
                  Zalo
                </a>
              </li>
            )}
            {site.facebookUrl && (
              <li>
                <a href={site.facebookUrl} target="_blank" rel="noreferrer">
                  Facebook
                </a>
              </li>
            )}
            {site.email && <li>{site.email}</li>}
            {site.address && <li>{site.address}</li>}
          </ul>
        </div>
      </div>

      <div className="sf-bottom">
        © {new Date().getFullYear()} {site.brandName}
      </div>
    </footer>
  )
}
