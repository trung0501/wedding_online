import { useEffect, useState } from 'react'
import { fetchTemplates } from '../lib/api'
import TemplateCard, { TemplateCardSkeleton } from '../components/TemplateCard'
import type { Template } from '../types'
import './gallery.css'

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
      <header className="page-head">
        <p className="sec-eyebrow">Kho mẫu thiệp</p>
        <h1 className="page-title">Chọn mẫu thiệp cưới</h1>
        <p className="page-lead">
          Bộ sưu tập thiệp mời điện tử nhiều phong cách. Xem thử trực tiếp, ưng ý rồi để chúng tôi hoàn thiện cho bạn.
        </p>
      </header>

      {state === 'error' && <p className="gl-note">Không tải được Thiệp mẫu. Vui lòng thử lại.</p>}
      {state === 'ok' && templates.length === 0 && <p className="gl-note">Chưa có mẫu nào được mở bán.</p>}

      <div className="gl-grid">
        {state === 'loading' && Array.from({ length: 6 }, (_, i) => <TemplateCardSkeleton key={i} />)}
        {state === 'ok' && templates.map((t) => <TemplateCard t={t} key={t.id} />)}
      </div>
    </div>
  )
}
