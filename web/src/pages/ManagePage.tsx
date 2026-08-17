import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  login,
  logout,
  fetchMe,
  fetchManageData,
  changePassword,
  computeStats,
  type ClientUser,
  type ManageData,
} from '../lib/auth'
import { site } from '../siteConfig'
import './manage.css'

type Phase = 'checking' | 'login' | 'loading' | 'ready' | 'error'

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

export default function ManagePage() {
  const [phase, setPhase] = useState<Phase>('checking')
  const [user, setUser] = useState<ClientUser | null>(null)
  const [data, setData] = useState<ManageData | null>(null)

  const load = useCallback(async () => {
    setPhase('loading')
    try {
      setData(await fetchManageData())
      setPhase('ready')
    } catch {
      setPhase('error')
    }
  }, [])

  // Còn phiên cũ thì vào thẳng, không bắt đăng nhập lại.
  useEffect(() => {
    fetchMe().then((me) => {
      if (me) {
        setUser(me)
        load()
      } else {
        setPhase('login')
      }
    })
  }, [load])

  async function onLoggedIn() {
    const me = await fetchMe()
    setUser(me)
    await load()
  }

  async function onLogout() {
    await logout()
    setUser(null)
    setData(null)
    setPhase('login')
  }

  if (phase === 'checking') return <div className="mn-center">Đang kiểm tra phiên đăng nhập…</div>
  if (phase === 'login') return <LoginForm onSuccess={onLoggedIn} />

  return (
    <div className="mn">
      <Header user={user} onLogout={onLogout} onReload={load} />
      {phase === 'loading' && <div className="mn-center">Đang tải dữ liệu…</div>}
      {phase === 'error' && (
        <div className="mn-center">
          Không tải được dữ liệu.{' '}
          <button className="mn-link" onClick={load}>
            Thử lại
          </button>
        </div>
      )}
      {phase === 'ready' && data && <Dashboard data={data} />}
    </div>
  )
}

// ---------- Đăng nhập ----------

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      await login(email.trim(), password)
      onSuccess()
    } catch {
      setErr('Email hoặc mật khẩu chưa đúng. Quý khách kiểm tra lại giúp chúng tôi nhé.')
      setBusy(false)
    }
  }

  return (
    <div className="mn-login">
      <form className="mn-login-card" onSubmit={submit}>
        <p className="mn-login-eyebrow">Trang theo dõi khách mời</p>
        <h1 className="mn-login-title">Đăng nhập</h1>
        <p className="mn-login-desc">Dùng email và mật khẩu chúng tôi đã gửi kèm link thiệp.</p>

        <label className="mn-label" htmlFor="mn-email">
          Email
        </label>
        <input
          id="mn-email"
          className="mn-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />

        <label className="mn-label" htmlFor="mn-pass">
          Mật khẩu
        </label>
        <input
          id="mn-pass"
          className="mn-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        <button className="mn-btn" type="submit" disabled={busy}>
          {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
        </button>

        {err && <p className="mn-err">{err}</p>}

        <p className="mn-login-help">
          Quên mật khẩu? Nhắn Zalo <a href={site.zaloUrl} target="_blank" rel="noreferrer">{site.phoneDisplay}</a> để chúng tôi đặt lại.
        </p>
      </form>
    </div>
  )
}

// ---------- Thanh trên ----------

function Header({ user, onLogout, onReload }: { user: ClientUser | null; onLogout: () => void; onReload: () => void }) {
  const [openPw, setOpenPw] = useState(false)
  return (
    <>
      <header className="mn-top">
        <div className="mn-top-inner">
          <div>
            <p className="mn-top-eyebrow">Trang theo dõi khách mời</p>
            <p className="mn-top-user">{user?.email}</p>
          </div>
          <div className="mn-top-actions">
            <button className="mn-ghost" onClick={onReload}>
              Tải lại
            </button>
            <button className="mn-ghost" onClick={() => setOpenPw(true)}>
              Đổi mật khẩu
            </button>
            <button className="mn-ghost" onClick={onLogout}>
              Đăng xuất
            </button>
          </div>
        </div>
      </header>
      {openPw && <ChangePassword onClose={() => setOpenPw(false)} />}
    </>
  )
}

function ChangePassword({ onClose }: { onClose: () => void }) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (pw.length < 8) return setMsg('Mật khẩu cần ít nhất 8 ký tự.')
    if (pw !== pw2) return setMsg('Hai ô mật khẩu chưa khớp nhau.')
    setState('busy')
    setMsg('')
    try {
      await changePassword(pw)
      setState('done')
    } catch {
      setState('error')
      setMsg('Đổi mật khẩu chưa được. Quý khách thử lại giúp chúng tôi nhé.')
    }
  }

  return (
    <div className="cm-backdrop" onMouseDown={onClose} role="presentation">
      <div className="cm" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
        <button className="cm-close" onClick={onClose} aria-label="Đóng">
          ×
        </button>
        {state === 'done' ? (
          <>
            <h2 className="cm-title">Đã đổi mật khẩu</h2>
            <p className="cm-desc">Lần sau Quý khách đăng nhập bằng mật khẩu mới nhé.</p>
            <button className="mn-btn" onClick={onClose}>
              Đóng
            </button>
          </>
        ) : (
          <form onSubmit={submit}>
            <h2 className="cm-title">Đổi mật khẩu</h2>
            <p className="cm-desc">Đặt mật khẩu riêng để chỉ hai bạn biết.</p>
            <label className="mn-label" htmlFor="pw1">
              Mật khẩu mới
            </label>
            <input id="pw1" className="mn-input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required />
            <label className="mn-label" htmlFor="pw2">
              Nhập lại
            </label>
            <input id="pw2" className="mn-input" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" required />
            <button className="mn-btn" type="submit" disabled={state === 'busy'}>
              {state === 'busy' ? 'Đang lưu…' : 'Lưu mật khẩu'}
            </button>
            {msg && <p className="mn-err">{msg}</p>}
          </form>
        )}
      </div>
    </div>
  )
}

// ---------- Bảng điều khiển ----------

function Dashboard({ data }: { data: ManageData }) {
  const { invitation: inv, variants, rsvps, guestbook } = data
  const s = computeStats(rsvps, guestbook)

  if (!inv) {
    return (
      <div className="mn-center">
        Chưa có thiệp nào gắn với tài khoản này. Quý khách nhắn Zalo {site.phoneDisplay} để chúng tôi kiểm tra giúp.
      </div>
    )
  }

  const yes = rsvps.filter((r) => r.attending === 'yes')
  const no = rsvps.filter((r) => r.attending === 'no')
  const wishes = [
    ...rsvps.filter((r) => r.message?.trim()).map((r) => ({ id: r.id, name: r.name, message: r.message, date: r.date_created })),
    ...guestbook.filter((g) => g.message?.trim()).map((g) => ({ id: g.id, name: g.name, message: g.message, date: g.date_created })),
  ]

  return (
    <div className="mn-body">
      <h1 className="mn-names">
        {inv.groom_name?.trim()} &amp; {inv.bride_name?.trim()}
      </h1>

      <div className="mn-stats">
        <Stat label="Lượt xác nhận" value={s.confirmed} accent />
        <Stat label="Tổng số người" value={s.totalPeople} accent />
        <Stat label="Báo không đến" value={s.declined} />
        <Stat label="Lời chúc" value={s.messages} />
      </div>

      {variants.length > 0 && (
        <Section title="Link thiệp">
          <div className="mn-links">
            {variants.map((v) => (
              <CopyLink key={v.id} slug={v.slug} type={v.variant_type} />
            ))}
          </div>
        </Section>
      )}

      <Section title={`Khách xác nhận tham dự (${yes.length})`}>
        {yes.length === 0 ? (
          <p className="mn-empty">Chưa có ai xác nhận. Khách mời xác nhận trên thiệp là sẽ hiện ở đây.</p>
        ) : (
          <GuestTable rows={yes} showCount />
        )}
      </Section>

      {no.length > 0 && (
        <Section title={`Khách báo không đến (${no.length})`}>
          <GuestTable rows={no} />
        </Section>
      )}

      <Section title={`Lời chúc (${wishes.length})`}>
        {wishes.length === 0 ? (
          <p className="mn-empty">Chưa có lời chúc nào.</p>
        ) : (
          <div className="mn-wishes">
            {wishes.map((w) => (
              <div className="mn-wish" key={w.id}>
                <p className="mn-wish-msg">{w.message}</p>
                <p className="mn-wish-meta">
                  <strong>{w.name || 'Ẩn danh'}</strong>
                  {w.date && <span> · {fmtDate(w.date)}</span>}
                </p>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`mn-stat ${accent ? 'is-accent' : ''}`}>
      <span className="mn-stat-num">{value}</span>
      <span className="mn-stat-label">{label}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mn-section">
      <h2 className="mn-h2">{title}</h2>
      {children}
    </section>
  )
}

const sideLabel: Record<string, string> = { groom: 'Nhà trai', bride: 'Nhà gái' }

function GuestTable({ rows, showCount }: { rows: ManageData['rsvps']; showCount?: boolean }) {
  return (
    <div className="mn-table-wrap">
      <table className="mn-table">
        <thead>
          <tr>
            <th>Tên khách</th>
            {showCount && <th className="mn-num">Số người</th>}
            <th>Bên</th>
            <th>Thời gian</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.name || '—'}</td>
              {showCount && <td className="mn-num">{r.num_guests || 1}</td>}
              <td>{r.side ? sideLabel[r.side] : '—'}</td>
              <td className="mn-dim">{fmtDate(r.date_created)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CopyLink({ slug, type }: { slug: string; type: string }) {
  const [copied, setCopied] = useState(false)
  const url = `${window.location.origin}/${slug}`
  const label: Record<string, string> = { combined: 'Khách chung', groom: 'Nhà trai', bride: 'Nhà gái' }

  return (
    <div className="mn-link-row">
      <div>
        <p className="mn-link-label">{label[type] ?? type}</p>
        <a className="mn-link-url" href={url} target="_blank" rel="noreferrer">
          {url}
        </a>
      </div>
      <button
        className="mn-ghost"
        onClick={() => {
          navigator.clipboard?.writeText(url)
          setCopied(true)
          setTimeout(() => setCopied(false), 1600)
        }}
      >
        {copied ? 'Đã chép' : 'Chép link'}
      </button>
    </div>
  )
}
