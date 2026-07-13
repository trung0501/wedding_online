import './hong-pastel-01.css'
import { assetUrl } from '../lib/directus'
import Countdown from '../components/Countdown'
import RsvpForm from '../components/RsvpForm'
import type { RenderData } from '../types'

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) : ''
const fmtTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''

const eventLabel: Record<string, string> = {
  le_vu_quy: 'Lễ Vu Quy',
  le_tan_hon: 'Lễ Tân Hôn',
  le_thanh_hon: 'Lễ Thành Hôn',
  tiec_cuoi: 'Tiệc Cưới',
}

export default function HongPastel01({ data }: { data: RenderData }) {
  const { invitation: inv, events, photos, gift_accounts } = data
  const demo = !data.variant
  const mainDate =
    events.find((e) => e.event_type === 'tiec_cuoi')?.event_at ??
    events.map((e) => e.event_at).filter(Boolean).sort()[0] ??
    inv.published_at ??
    null
  const cover = assetUrl(inv.cover_photo)

  return (
    <div className="hp">
      {/* HERO */}
      <section
        className="hp-hero"
        style={
          cover
            ? { backgroundImage: `linear-gradient(rgba(120,60,75,.30), rgba(120,60,75,.50)), url(${cover})` }
            : undefined
        }
      >
        <div className="hp-hero-inner">
          <p className="hp-eyebrow">Trân trọng kính mời</p>
          <h1 className="hp-names">
            {inv.groom_name} <span className="hp-amp">&amp;</span> {inv.bride_name}
          </h1>
          <p className="hp-hero-date">{fmtDate(mainDate)}</p>
          <Countdown date={mainDate} />
        </div>
      </section>

      {/* LỜI NGỎ + STORY */}
      <section className="hp-section hp-story">
        <h2 className="hp-h2">Chuyện chúng mình</h2>
        <div className="hp-divider">♥</div>
        {inv.love_story && <p className="hp-story-text">{inv.love_story}</p>}
        <div className="hp-families">
          <div className="hp-family">
            <h3>Nhà Trai</h3>
            {inv.groom_father && <p>Ông: {inv.groom_father}</p>}
            {inv.groom_mother && <p>Bà: {inv.groom_mother}</p>}
          </div>
          <div className="hp-family">
            <h3>Nhà Gái</h3>
            {inv.bride_father && <p>Ông: {inv.bride_father}</p>}
            {inv.bride_mother && <p>Bà: {inv.bride_mother}</p>}
          </div>
        </div>
      </section>

      {/* LỊCH TRÌNH */}
      {events.length > 0 && (
        <section className="hp-section hp-events">
          <h2 className="hp-h2">Sự kiện cưới</h2>
          <div className="hp-divider">♥</div>
          <div className="hp-event-grid">
            {events.map((ev) => (
              <div className="hp-event-card" key={ev.id}>
                <h3 className="hp-event-title">{ev.title || eventLabel[ev.event_type ?? ''] || 'Sự kiện'}</h3>
                <p className="hp-event-time">
                  {fmtTime(ev.event_at)} · {fmtDate(ev.event_at)}
                </p>
                {ev.venue_name && <p className="hp-event-venue">{ev.venue_name}</p>}
                {ev.address && <p className="hp-event-addr">{ev.address}</p>}
                {ev.map_url && (
                  <a className="hp-btn hp-btn-sm" href={ev.map_url} target="_blank" rel="noreferrer">
                    Chỉ đường
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ALBUM */}
      {photos.length > 0 && (
        <section className="hp-section hp-album">
          <h2 className="hp-h2">Khoảnh khắc</h2>
          <div className="hp-divider">♥</div>
          <div className="hp-album-grid">
            {photos.map((p) => (
              <div className="hp-photo" key={p.id}>
                <img src={assetUrl(p.image)} alt={p.caption ?? ''} loading="lazy" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* RSVP */}
      <section className="hp-section hp-rsvp">
        <h2 className="hp-h2">Xác nhận tham dự</h2>
        <div className="hp-divider">♥</div>
        <p className="hp-rsvp-intro">Sự hiện diện của bạn là niềm vinh hạnh của chúng tôi.</p>
        <RsvpForm invitationId={inv.id} demo={demo} />
      </section>

      {/* MỪNG CƯỚI QR */}
      {gift_accounts.length > 0 && (
        <section className="hp-section hp-gift">
          <h2 className="hp-h2">Mừng cưới</h2>
          <div className="hp-divider">♥</div>
          <div className="hp-gift-grid">
            {gift_accounts.map((g) => (
              <div className="hp-gift-card" key={g.id}>
                <h3>{g.side === 'groom' ? 'Nhà Trai' : 'Nhà Gái'}</h3>
                {g.qr_image && <img className="hp-qr" src={assetUrl(g.qr_image)} alt="QR chuyển khoản" loading="lazy" />}
                {g.bank_name && <p>{g.bank_name}</p>}
                {g.account_holder && <p className="hp-strong">{g.account_holder}</p>}
                {g.account_number && <p className="hp-acct">{g.account_number}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="hp-footer">
        <p className="hp-footer-names">
          {inv.groom_name} &amp; {inv.bride_name}
        </p>
        <p>Cảm ơn bạn đã chung vui cùng chúng tôi ♥</p>
        {demo && <p className="hp-demo-badge">Bản demo — dữ liệu mẫu</p>}
      </footer>
    </div>
  )
}
