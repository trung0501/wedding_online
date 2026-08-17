import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { createBrief } from '../lib/api'
import { site } from '../siteConfig'

// ---------- Context: mọi nút "Nhận tư vấn" ở bất kỳ trang nào đều mở được popup ----------

type ConsultCtx = { open: () => void }
const Ctx = createContext<ConsultCtx>({ open: () => {} })

export function useConsult() {
  return useContext(Ctx)
}

const EMPTY = { contact_name: '', contact_phone: '', contact_email: '' }

export function ConsultProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const firstInput = useRef<HTMLInputElement>(null)

  const open = useCallback(() => {
    setForm(EMPTY)
    setStatus('idle')
    setIsOpen(true)
  }, [])

  const close = useCallback(() => setIsOpen(false), [])

  // Esc để đóng + khoá cuộn nền khi popup đang mở.
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    firstInput.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [isOpen, close])

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!form.contact_name.trim() || !form.contact_phone.trim()) return
    setStatus('sending')
    try {
      await createBrief({
        contact_name: form.contact_name.trim(),
        contact_phone: form.contact_phone.trim(),
        contact_email: form.contact_email.trim() || null,
        // Đánh dấu nguồn để nhân viên biết đây là khách xin tư vấn,
        // chưa chọn mẫu — khác với khách điền form đặt thiệp đầy đủ.
        source: 'consult',
      })
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  return (
    <Ctx.Provider value={{ open }}>
      {children}

      {isOpen && (
        <div className="cm-backdrop" onMouseDown={close} role="presentation">
          <div
            className="cm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cm-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button className="cm-close" onClick={close} aria-label="Đóng">
              ×
            </button>

            {status === 'done' ? (
              <div className="cm-done">
                <div className="cm-check" aria-hidden="true">
                  ♥
                </div>
                <h2 className="cm-title" id="cm-title">
                  Cảm ơn {form.contact_name}!
                </h2>
                <p className="cm-desc">
                  Chúng tôi đã nhận được thông tin và sẽ liên hệ với Quý khách qua Zalo trong thời gian sớm nhất.
                </p>
                <button className="btn btn-primary cm-submit" onClick={close}>
                  Đóng
                </button>
              </div>
            ) : (
              <>
                <p className="cm-eyebrow">Miễn phí</p>
                <h2 className="cm-title" id="cm-title">
                  Nhận tư vấn
                </h2>
                <p className="cm-desc">
                  Để lại thông tin, chúng tôi liên hệ tư vấn mẫu thiệp và báo giá phù hợp với hai bạn.
                </p>

                <form className="cm-form" onSubmit={submit}>
                  <div className="cm-group">
                    <label className="cm-label" htmlFor="cm-name">
                      Họ và tên *
                    </label>
                    <input
                      id="cm-name"
                      ref={firstInput}
                      className="cm-input"
                      value={form.contact_name}
                      onChange={set('contact_name')}
                      required
                      autoComplete="name"
                    />
                  </div>

                  <div className="cm-group">
                    <label className="cm-label" htmlFor="cm-phone">
                      Số điện thoại *
                    </label>
                    <input
                      id="cm-phone"
                      className="cm-input"
                      type="tel"
                      inputMode="tel"
                      value={form.contact_phone}
                      onChange={set('contact_phone')}
                      required
                      autoComplete="tel"
                    />
                    <span className="cm-hint">Chúng tôi sẽ liên hệ qua Zalo theo số này</span>
                  </div>

                  <div className="cm-group">
                    <label className="cm-label" htmlFor="cm-email">
                      Email <span className="cm-optional">(nếu có)</span>
                    </label>
                    <input
                      id="cm-email"
                      className="cm-input"
                      type="email"
                      value={form.contact_email}
                      onChange={set('contact_email')}
                      autoComplete="email"
                    />
                  </div>

                  <button className="btn btn-primary cm-submit" type="submit" disabled={status === 'sending'}>
                    {status === 'sending' ? 'Đang gửi…' : 'Gửi thông tin'}
                  </button>

                  {status === 'error' && (
                    <p className="cm-err">
                      Gửi chưa được. Quý khách gọi trực tiếp{' '}
                      <a href={`tel:${site.phone}`}>{site.phoneDisplay}</a> giúp chúng tôi nhé.
                    </p>
                  )}
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}
