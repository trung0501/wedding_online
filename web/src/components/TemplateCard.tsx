import { Link } from 'react-router-dom'
import { assetUrl } from '../lib/directus'
import type { Template } from '../types'

const badgeText: Record<string, string> = { hot: 'Hot', new: 'Mới' }

// Thứ tự ưu tiên ảnh preview:
//   1. templates.thumbnail trong Directus (nhân viên tự upload để ghi đè)
//   2. ảnh tĩnh web/public/thumbs/<component_key>.jpg (sinh bởi tools/gen-thumbnails.mjs)
//   3. ô chữ placeholder
export function thumbSrc(t: Template): string {
  if (t.thumbnail) return assetUrl(t.thumbnail, 'card')
  if (t.component_key) return `/thumbs/${t.component_key}.jpg`
  return ''
}

export default function TemplateCard({ t }: { t: Template }) {
  const src = thumbSrc(t)
  return (
    <Link className="gl-card" to={`/mau/${t.slug}`}>
      <div className="gl-thumb">
        {src ? (
          <img
            src={src}
            alt={t.name}
            loading="lazy"
            // Ảnh tĩnh chưa được sinh → ẩn <img>, để lộ ô chữ placeholder bên dưới.
            onError={(e) => (e.currentTarget.style.display = 'none')}
          />
        ) : null}
        <div className="gl-thumb-ph">
          <span>{t.name}</span>
        </div>
        {t.badge && t.badge !== 'none' && <span className={`gl-badge gl-badge-${t.badge}`}>{badgeText[t.badge]}</span>}
      </div>
      <div className="gl-card-body">
        <h3 className="gl-card-name">{t.name}</h3>
        {t.description && <p className="gl-card-desc">{t.description}</p>}
        <span className="gl-card-cta">Xem mẫu →</span>
      </div>
    </Link>
  )
}

// Khung xám nhấp nháy khi đang tải — đỡ giật hơn dòng chữ "Đang tải…".
export function TemplateCardSkeleton() {
  return (
    <div className="gl-card gl-card-skeleton" aria-hidden="true">
      <div className="gl-thumb gl-sk" />
      <div className="gl-card-body">
        <div className="gl-sk gl-sk-line gl-sk-line-lg" />
        <div className="gl-sk gl-sk-line" />
        <div className="gl-sk gl-sk-line gl-sk-line-sm" />
      </div>
    </div>
  )
}
