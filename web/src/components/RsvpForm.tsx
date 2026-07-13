import { useState } from 'react'
import type { FormEvent } from 'react'
import { createItem } from '@directus/sdk'
import { directus } from '../lib/directus'

export default function RsvpForm({ invitationId, demo = false }: { invitationId: string; demo?: boolean }) {
  const [name, setName] = useState('')
  const [attending, setAttending] = useState<'yes' | 'no'>('yes')
  const [num, setNum] = useState(1)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

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
            message,
          }),
        )
      }
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
        <input
          className="hp-input"
          type="number"
          min={1}
          max={20}
          value={num}
          onChange={(e) => setNum(Number(e.target.value))}
          placeholder="Số người tham dự"
        />
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
