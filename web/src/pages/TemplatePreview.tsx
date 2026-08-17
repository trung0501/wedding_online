import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchTemplateBySlug, fetchInvitationBySlug } from '../lib/api'
import { resolveTemplate } from '../templates/registry'
import { sampleInvitation } from '../data/sampleInvitation'
import type { Template, RenderData } from '../types'
import './gallery.css'

export default function TemplatePreview() {
  const { slug } = useParams()
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [template, setTemplate] = useState<Template | null>(null)
  const [data, setData] = useState<RenderData | null>(null)

  useEffect(() => {
    let alive = true
    setState('loading')
    ;(async () => {
      const t = await fetchTemplateBySlug(slug ?? '')
      if (!t) {
        if (alive) {
          setTemplate(null)
          setState('error')
        }
        return
      }
      // Nội dung preview: lấy từ "thiệp demo" (demo_slug) trong Directus; nếu chưa set thì dùng sample.
      let content: RenderData | null = null
      if (t.demo_slug) {
        try {
          content = await fetchInvitationBySlug(t.demo_slug)
        } catch {
          content = null
        }
      }
      if (!content) content = sampleInvitation
      if (alive) {
        setTemplate(t)
        // variant: null → chạy ở chế độ preview (RSVP không ghi vào DB, hiện nhãn demo).
        setData({ ...content, template: t, variant: null })
        setState('ok')
      }
    })().catch(() => alive && setState('error'))
    return () => {
      alive = false
    }
  }, [slug])

  if (state === 'loading') return <div className="hp-center">Đang tải mẫu…</div>
  if (state === 'error' || !template || !data) return <div className="hp-center">Không tìm thấy mẫu này ♥</div>

  const Template = resolveTemplate(template.component_key)

  return (
    <div className="tp">
      <div className="tp-bar">
        <Link className="tp-back" to="/kho-mau-thiep">
          ← Kho mẫu thiệp
        </Link>
        <span className="tp-name">{template.name}</span>
        <Link className="tp-cta" to={`/dat-thiep?mau=${template.slug}`}>
          Chọn mẫu này
        </Link>
      </div>
      <div className="tp-frame">
        <Template data={data} />
      </div>
    </div>
  )
}
