import { useEffect, useState } from 'react'
import { serverHealth } from '@directus/sdk'
import { directus, DIRECTUS_URL } from './lib/directus'

type Status = 'checking' | 'ok' | 'error'

export default function App() {
  const [status, setStatus] = useState<Status>('checking')
  const [detail, setDetail] = useState<string>('Đang kết nối tới Directus...')

  useEffect(() => {
    directus
      .request(serverHealth())
      .then((res) => {
        setStatus('ok')
        setDetail(`status: ${(res as { status?: string })?.status ?? 'unknown'}`)
      })
      .catch((err: unknown) => {
        setStatus('error')
        const msg = err instanceof Error ? err.message : String(err)
        setDetail(msg)
      })
  }, [])

  const color = status === 'ok' ? '#16a34a' : status === 'error' ? '#dc2626' : '#d97706'
  const label =
    status === 'ok'
      ? 'Đã kết nối Directus'
      : status === 'error'
        ? 'Chưa kết nối được Directus'
        : 'Đang kiểm tra...'

  return (
    <main className="wrap">
      <div className="card">
        <p className="eyebrow">Thiệp Cưới Online · P0</p>
        <h1>
          Nền móng đã sẵn sàng <span className="heart">♥</span>
        </h1>
        <p className="sub">
          React + Vite chạy tốt. Bên dưới là trạng thái kết nối tới Directus API.
        </p>

        <div className="status" style={{ borderColor: color }}>
          <span className="dot" style={{ background: color }} />
          <div>
            <strong style={{ color }}>{label}</strong>
            <div className="detail">{detail}</div>
            <div className="detail">API: {DIRECTUS_URL}</div>
          </div>
        </div>

        {status === 'error' && (
          <p className="hint">
            Kiểm tra: đã chạy <code>docker compose up -d</code> chưa, và{' '}
            <code>VITE_DIRECTUS_URL</code> trong <code>web/.env</code> có trỏ đúng không.
          </p>
        )}
      </div>
    </main>
  )
}
