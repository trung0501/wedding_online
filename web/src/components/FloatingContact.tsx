import { site } from '../siteConfig'

// Nút liên hệ nổi góc phải màn hình.
// Khung tròn đã dựng sẵn — thả ảnh vào web/public/icons/zalo.png và
// web/public/icons/phone.png là tự thay. Chưa có ảnh thì dùng icon mặc định bên dưới.
function CircleButton({
  href,
  label,
  icon,
  className,
  fallback,
}: {
  href: string
  label: string
  icon: string
  className: string
  fallback: React.ReactNode
}) {
  return (
    <a className={`fc-btn ${className}`} href={href} target="_blank" rel="noreferrer" aria-label={label} title={label}>
      <span className="fc-fallback">{fallback}</span>
      <img
        className="fc-img"
        src={icon}
        alt=""
        // Chưa có ảnh → ẩn <img>, để lộ icon mặc định nằm dưới.
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />
      <span className="fc-pulse" />
    </a>
  )
}

export default function FloatingContact() {
  return (
    <div className="fc">
      <CircleButton
        href={site.zaloUrl}
        label="Nhắn Zalo"
        icon="/icons/zalo.png"
        className="fc-zalo"
        fallback={<span className="fc-text">Zalo</span>}
      />
      <CircleButton
        href={`tel:${site.phone}`}
        label={`Gọi ${site.phoneDisplay}`}
        icon="/icons/phone.png"
        className="fc-phone"
        fallback={
          <svg viewBox="0 0 24 24" className="fc-svg" aria-hidden="true">
            <path
              fill="currentColor"
              d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1l-2.3 2.2Z"
            />
          </svg>
        }
      />
    </div>
  )
}
