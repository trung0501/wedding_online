import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTemplates } from '../lib/api'
import TemplateCard, { TemplateCardSkeleton } from '../components/TemplateCard'
import { useConsult } from '../components/ConsultModal'
import { hero, valueProps, steps, finalCta } from '../siteConfig'
import type { Template } from '../types'
import './gallery.css'

const FEATURED = 6

export default function HomePage() {
  const consult = useConsult()
  const [templates, setTemplates] = useState<Template[]>([])
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')

  useEffect(() => {
    fetchTemplates()
      .then((t) => {
        setTemplates(t.slice(0, FEATURED))
        setState('ok')
      })
      .catch(() => setState('error'))
  }, [])

  return (
    <>
      <section className="hero" style={{ backgroundImage: `url(${hero.image})` }}>
        <div className="hero-scrim" />
        <div className="hero-inner">
          <p className="hero-eyebrow">{hero.eyebrow}</p>
          <h1 className="hero-title">{hero.title}</h1>
          <p className="hero-sub">{hero.subtitle}</p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to={hero.primaryCta.to}>
              {hero.primaryCta.label}
            </Link>
            <button className="btn btn-ghost" onClick={consult.open}>
              {hero.secondaryCta.label}
            </button>
          </div>
        </div>
      </section>

      <section className="sec sec-values">
        <div className="sec-inner">
          <p className="sec-eyebrow">Vì sao chọn chúng tôi</p>
          <h2 className="sec-title">Thiệp đẹp là chưa đủ</h2>
          <p className="sec-lead">
            Ngày cưới chỉ có một lần. Chúng tôi làm phần kỹ thuật để hai bạn yên tâm lo những việc quan trọng hơn.
          </p>
          <div className="vp-grid">
            {valueProps.map((v, i) => (
              <div className="vp-card" key={v.title}>
                <span className="vp-no">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="vp-title">{v.title}</h3>
                <p className="vp-desc">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec sec-templates">
        <div className="sec-inner">
          <p className="sec-eyebrow">Kho mẫu thiệp</p>
          <h2 className="sec-title">Mẫu thiệp nổi bật</h2>
          <p className="sec-lead">Mỗi mẫu một phong cách riêng. Bấm vào để xem thử toàn bộ thiệp ngay trên trình duyệt.</p>

          {state === 'error' && <p className="gl-note">Không tải được Thiệp mẫu. Vui lòng thử lại.</p>}

          <div className="gl-grid">
            {state === 'loading' && Array.from({ length: 3 }, (_, i) => <TemplateCardSkeleton key={i} />)}
            {state === 'ok' && templates.map((t) => <TemplateCard t={t} key={t.id} />)}
          </div>

          {state === 'ok' && (
            <div className="sec-more">
              <Link className="btn btn-outline" to="/kho-mau-thiep">
                Xem toàn bộ kho mẫu →
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="sec sec-steps">
        <div className="sec-inner">
          <p className="sec-eyebrow">Quy trình</p>
          <h2 className="sec-title">Bốn bước là xong</h2>
          <div className="st-grid">
            {steps.map((s) => (
              <div className="st-card" key={s.no}>
                <span className="st-no">{s.no}</span>
                <h3 className="st-title">{s.title}</h3>
                <p className="st-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec sec-cta">
        <div className="sec-inner cta-box">
          <h2 className="cta-title">{finalCta.title}</h2>
          <p className="cta-desc">{finalCta.desc}</p>
          <button className="btn btn-primary" onClick={consult.open}>
            {finalCta.cta.label}
          </button>
        </div>
      </section>
    </>
  )
}
