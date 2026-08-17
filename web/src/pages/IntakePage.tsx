import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchTemplateBySlug, createBrief } from '../lib/api'
import type { Template } from '../types'
import './gallery.css'

export default function IntakePage() {
  const [params] = useSearchParams()
  const mau = params.get('mau')

  const [template, setTemplate] = useState<Template | null>(null)
  const [form, setForm] = useState({
    contact_name: '',
    contact_phone: '',
    contact_channel: '',
    groom_name: '',
    bride_name: '',
    event_info: '',
    wish: '',
  })
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  useEffect(() => {
    if (mau) fetchTemplateBySlug(mau).then(setTemplate).catch(() => setTemplate(null))
  }, [mau])

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form.contact_name.trim() || !form.contact_phone.trim()) return
    setStatus('sending')
    try {
      await createBrief({ ...form, template: template?.id ?? null })
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="gl-order">
        <div className="gl-order-card">
          <p className="gl-eyebrow">Đã nhận thông tin</p>
          <h1 className="gl-order-title">Cảm ơn {form.contact_name}! ♥</h1>
          <p className="gl-order-note">
            Chúng tôi đã nhận được yêu cầu của Quý khách và sẽ liên hệ sớm nhất để hoàn thiện thiệp cưới. Quý khách có thể gửi
            thêm ảnh cưới qua Zalo/Facebook khi chúng tôi liên hệ.
          </p>
          <Link className="tp-cta" to="/kho-mau-thiep">
            ← Về kho mẫu thiệp
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="ik">
      <div className="ik-head">
        <Link className="tp-back" to={mau ? `/mau/${mau}` : '/kho-mau-thiep'}>
          ← Quay lại
        </Link>
        <h1 className="ik-title">Đặt thiệp cưới</h1>
        <p className="ik-sub">
          Điền thông tin bên dưới, chúng tôi sẽ dựng thiệp và gửi bản xem trước cho bạn duyệt.
          {template && (
            <>
              {' '}
              Mẫu đã chọn: <strong>{template.name}</strong>.
            </>
          )}
        </p>
      </div>

      <form className="ik-form" onSubmit={submit}>
        <div className="ik-group">
          <label className="ik-label">Họ tên người liên hệ *</label>
          <input className="ik-input" value={form.contact_name} onChange={set('contact_name')} required />
        </div>
        <div className="ik-row">
          <div className="ik-group">
            <label className="ik-label">Số điện thoại *</label>
            <input className="ik-input" value={form.contact_phone} onChange={set('contact_phone')} required />
          </div>
          <div className="ik-group">
            <label className="ik-label">Zalo / Facebook (nếu có)</label>
            <input className="ik-input" value={form.contact_channel} onChange={set('contact_channel')} />
          </div>
        </div>
        <div className="ik-row">
          <div className="ik-group">
            <label className="ik-label">Tên cô dâu</label>
            <input className="ik-input" value={form.bride_name} onChange={set('bride_name')} />
          </div>
          <div className="ik-group">
            <label className="ik-label">Tên chú rể</label>
            <input className="ik-input" value={form.groom_name} onChange={set('groom_name')} />
          </div>
        </div>
        <div className="ik-group">
          <label className="ik-label">Thông tin lễ / tiệc (Ngày giờ, địa điểm)</label>
          <textarea className="ik-input" rows={4} value={form.event_info} onChange={set('event_info')} placeholder="VD: Lễ vu quy 9h ngày 20/12/2026 tại nhà gái…; Tiệc cưới 18h cùng ngày tại…" />
        </div>
        <div className="ik-group">
          <label className="ik-label">Lời nhắn / yêu cầu riêng</label>
          <textarea className="ik-input" rows={3} value={form.wish} onChange={set('wish')} />
        </div>

        <button className="ik-btn" type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Đang gửi…' : 'Gửi yêu cầu'}
        </button>
        {status === 'error' && <p className="ik-err">Gửi chưa được, vui lòng thử lại sau giây lát.</p>}
        <p className="ik-note">* Bắt buộc. Ảnh cưới sẽ được gửi qua Zalo/Facebook khi chúng tôi liên hệ với bạn.</p>
      </form>
    </div>
  )
}
