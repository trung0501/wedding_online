import { useState } from 'react'
import type { FormEvent } from 'react'
import { createItem } from '@directus/sdk'
import { directus } from '../lib/directus'

export type GuestSide = 'groom' | 'bride'

export default function RsvpForm({
  invitationId,
  demo = false,
  defaultSide = null,
  onSent,
}: {
  invitationId: string
  demo?: boolean
  /**
   * Khách vào link nhà trai / nhà gái thì đã biết bên rồi — không hỏi lại.
   * Link khách chung (và bản xem thử mẫu) truyền null, form sẽ hiện thêm một
   * dòng cho khách tự chọn. Không chọn vẫn gửi được, chỉ là cột "Bên" ở trang
   * quản lý sẽ trống cho lượt đó.
   */
  defaultSide?: GuestSide | null
  onSent?: (entry: { name: string; message: string }) => void
}) {
  const [name, setName] = useState('')
  const [attending, setAttending] = useState<'yes' | 'no'>('yes')
  const [num, setNum] = useState(1)
  const [side, setSide] = useState<GuestSide | null>(defaultSide)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  const askSide = !defaultSide

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setStatus('sending')
    try {
      if (demo) {
        await new Promise((r) => setTimeout(r, 500))
      } else {
        await directus.request(
          createItem('rsvps', {
            invitation: invitationId,
            name,
            attending,
            num_guests: attending === 'yes' ? num : 0,
            side,
            // CỐ TÌNH không ghi lời chúc vào đây. Lời chúc chỉ có MỘT chỗ duy
            // nhất là bảng guestbook. Trước đây ghi vào cả hai bảng nên trang
            // /quan-ly đếm và hiển thị mỗi lời chúc hai lần.
          }),
        )
        // Lời chúc ghi vào guestbook để hiện lên tường lưu bút.
        // rsvps không mở quyền đọc cho khách mời, guestbook thì có (chỉ bản đã duyệt).
        if (message.trim()) {
          await directus
            .request(createItem('guestbook', { invitation: invitationId, name, message: message.trim() }))
            .catch(() => {
              /* gửi lời chúc lỗi thì thôi, RSVP đã ghi xong — không làm khách hoảng */
            })
        }
      }
      if (message.trim()) onSent?.({ name, message: message.trim() })
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="hp-rsvp-done">
        Cảm ơn {name}! Phản hồi của bạn đã được ghi nhận ♥{demo ? ' (chế độ demo)' : ''}
      </div>
    )
  }

  return (
    <form className="hp-rsvp-form" onSubmit={submit}>
      <input
        className="hp-input"
        placeholder="Tên của bạn"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <div className="hp-rsvp-row">
        <label className={`hp-choice ${attending === 'yes' ? 'active' : ''}`}>
          <input type="radio" name="att" checked={attending === 'yes'} onChange={() => setAttending('yes')} /> Tham dự
        </label>
        <label className={`hp-choice ${attending === 'no' ? 'active' : ''}`}>
          <input type="radio" name="att" checked={attending === 'no'} onChange={() => setAttending('no')} /> Không thể đến
        </label>
      </div>
      {attending === 'yes' && (
        <div className="hp-field">
          <label className="hp-field-label" htmlFor="hp-num">
            Số người tham dự (tính cả bạn)
          </label>
          <input
            id="hp-num"
            className="hp-input"
            type="number"
            min={1}
            max={20}
            value={num}
            onChange={(e) => setNum(Number(e.target.value))}
          />
        </div>
      )}
      {askSide && (
        <div className="hp-field">
          <span className="hp-field-label">Bạn là khách của bên nào?</span>
          <div className="hp-rsvp-row">
            <label className={`hp-choice ${side === 'groom' ? 'active' : ''}`}>
              <input type="radio" name="side" checked={side === 'groom'} onChange={() => setSide('groom')} /> Nhà trai
            </label>
            <label className={`hp-choice ${side === 'bride' ? 'active' : ''}`}>
              <input type="radio" name="side" checked={side === 'bride'} onChange={() => setSide('bride')} /> Nhà gái
            </label>
          </div>
        </div>
      )}
      <textarea
        className="hp-input"
        rows={3}
        placeholder="Lời chúc tới cô dâu chú rể…"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button className="hp-btn" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Đang gửi…' : 'Gửi xác nhận'}
      </button>
      {status === 'error' && <div className="hp-err">Có lỗi khi gửi, vui lòng thử lại.</div>}
    </form>
  )
}
