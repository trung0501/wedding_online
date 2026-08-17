import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { site, nav } from '../siteConfig'

export default function SiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sh">
      <div className="sh-inner">
        {/* Chỗ đặt logo. Thả file vào web/public/logo.png là tự hiện, chưa có thì dùng chữ. */}
        <Link className="sh-brand" to="/" onClick={() => setOpen(false)}>
          <img
            className="sh-logo"
            src="/logo.png"
            alt={site.brandName}
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
          <span className="sh-brand-text">{site.brandName}</span>
        </Link>

        <nav className={`sh-nav ${open ? 'is-open' : ''}`}>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `sh-link ${isActive ? 'is-active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          <a className="sh-phone sh-phone-mobile" href={`tel:${site.phone}`}>
            {site.phoneDisplay}
          </a>
        </nav>

        <a className="sh-phone" href={`tel:${site.phone}`}>
          <svg className="sh-phone-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.2.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.4 0 .8-.2 1l-2.3 2.2Z"
            />
          </svg>
          {site.phoneDisplay}
        </a>

        <button
          className="sh-burger"
          onClick={() => setOpen(!open)}
          aria-label="Mở menu"
          aria-expanded={open}
        >
          <span /><span /><span />
        </button>
      </div>
    </header>
  )
}
