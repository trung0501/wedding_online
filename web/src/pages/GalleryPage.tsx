import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTemplates } from '../lib/api'
import { assetUrl } from '../lib/directus'
import type { Template } from '../types'
import './gallery.css'

const badgeText: Record<string, string> = { hot: 'Hot', new: 'Mới' }

export default function GalleryPage() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    fetchTemplates()
      .then((t) => {
        setTemplates(t)
        setState('ok')
      })
      .catch(() => setState('error'))
  }, [])

  return (
    <div className="gl">
      <header className="gl-hero">
        <p className="gl-eyebrow">Thiệp cưới Online</p>
        <h1 className="gl-title">Chọn mẫu thiệp cưới</h1>
        <p className="gl-sub">
          Bộ sưu tập thiệp mời điện tử nhiều phong cách. Xem thử trực tiếp, ưng ý rồi để chúng tôi hoàn thiện cho bạn.
        </p>
      </header>

      {state === 'loading' && <p className="gl-note">Đang tải mẫu…</p>}
      {state === 'error' && <p className="gl-note">Không tải được Thiệp mẫu. Vui lòng thử lại.</p>}
      {state === 'ok' && templates.length === 0 && <p className="gl-note">Chưa có mẫu nào được mở bán.</p>}

      {state === 'ok' && templates.length > 0 && (
        <div className="gl-grid">
          {templates.map((t) => (
            <Link className="gl-card" to={`/mau/${t.slug}`} key={t.id}>
              <div className="gl-thumb">
                {t.thumbnail ? (
                  <img src={assetUrl(t.thumbnail)} alt={t.name} loading="lazy" />
                ) : (
                  <div className="gl-thumb-ph">
                    <span>{t.name}</span>
                  </div>
                )}
                {t.badge && t.badge !== 'none' && <span className={`gl-badge gl-badge-${t.badge}`}>{badgeText[t.badge]}</span>}
              </div>
              <div className="gl-card-body">
                <h3 className="gl-card-name">{t.name}</h3>
                {t.description && <p className="gl-card-desc">{t.description}</p>}
                <span className="gl-card-cta">Xem mẫu →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <footer className="gl-footer">
        <p>Thiệp Cưới Online</p>
      </footer>
    </div>
  )
}
