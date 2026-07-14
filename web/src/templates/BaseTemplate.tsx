import type { CSSProperties, ReactNode } from 'react'
import './template-base.css'
import { assetUrl } from '../lib/directus'
import Countdown from '../components/Countdown'
import RsvpForm from '../components/RsvpForm'
import type { RenderData } from '../types'
import type { Theme, SectionKey } from './themes'

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

export default function BaseTemplate({ data, theme }: { data: RenderData; theme: Theme }) {
  const { invitation: inv, events, photos, gift_accounts } = data
  const demo = !data.variant
  const mainDate =
    events.find((e) => e.event_type === 'tiec_cuoi')?.event_at ??
    events.map((e) => e.event_at).filter(Boolean).sort()[0] ??
    inv.published_at ??
    null
  const cover = assetUrl(inv.cover_photo)

  const styleVars: Record<string, string> = {
    '--hp-bg': theme.bg,
    '--hp-cream': theme.cream,
    '--hp-primary': theme.primary,
    '--hp-primary-soft': theme.primarySoft,
    '--hp-deep': theme.deep,
    '--hp-text': theme.text,
    '--hp-muted': theme.muted,
    '--hp-line': theme.line,
    '--hp-heading': theme.heading,
    '--hp-body': theme.body,
  }

  const title = (t: string) => (
    <>
      <h2 className="hp-h2">{t}</h2>
      <div className="hp-divider">{theme.motif}</div>
    </>
  )

  const heroInner = (
    <div className="hp-hero-inner">
      <p className="hp-eyebrow">{theme.eyebrow}</p>
      <h1 className="hp-names">
        {inv.groom_name} <span className="hp-amp">&amp;</span> {inv.bride_name}
      </h1>
      <p className="hp-hero-date">{fmtDate(mainDate)}</p>
      <Countdown date={mainDate} />
    </div>
  )

  let hero: ReactNode
  if (theme.heroVariant === 'split') {
    hero = (
      <section className="hp-hero hp-hero-split">
        <div className="hp-split-img" style={cover ? { backgroundImage: `url(${cover})` } : undefined} />
        <div className="hp-split-info">{heroInner}</div>
      </section>
    )
  } else if (theme.heroVariant === 'minimal') {
    hero = (
      <section className="hp-hero hp-hero-minimal">
        <div className="hp-minimal-frame">{heroInner}</div>
      </section>
    )
  } else {
    hero = (
      <section
        className="hp-hero"
        style={cover ? { backgroundImage: `linear-gradient(${theme.heroOverlay}), url(${cover})` } : undefined}
      >
        {heroInner}
      </section>
    )
  }

  const eventsContent =
    theme.eventsVariant === 'timeline' ? (
      <div className="hp-timeline">
        {events.map((ev) => (
          <div className="hp-tl-item" key={ev.id}>
            <span className="hp-tl-dot" />
            <div className="hp-tl-card">
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
          </div>
        ))}
      </div>
    ) : (
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
    )

  const sections: Record<SectionKey, ReactNode> = {
    story: (
      <section className="hp-section hp-story" key="story">
        {title('Chuyện chúng mình')}
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
    ),
    events:
      events.length > 0 ? (
        <section className="hp-section hp-events" key="events">
          {title('Sự kiện cưới')}
          {eventsContent}
        </section>
      ) : null,
    album:
      photos.length > 0 ? (
        <section className="hp-section hp-album" key="album">
          {title('Khoảnh khắc')}
          <div className="hp-album-grid">
            {photos.map((p) => (
              <div className="hp-photo" key={p.id}>
                <img src={assetUrl(p.image)} alt={p.caption ?? ''} loading="lazy" />
              </div>
            ))}
          </div>
        </section>
      ) : null,
    rsvp: (
      <section className="hp-section hp-rsvp" key="rsvp">
        {title('Xác nhận tham dự')}
        <p className="hp-rsvp-intro">Sự hiện diện của bạn là niềm vinh hạnh của chúng tôi.</p>
        <RsvpForm invitationId={inv.id} demo={demo} />
      </section>
    ),
    gift:
      gift_accounts.length > 0 ? (
        <section className="hp-section hp-gift" key="gift">
          {title('Mừng cưới')}
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
      ) : null,
  }

  return (
    <div className="hp" style={styleVars as CSSProperties}>
      {hero}
      {theme.order.map((k) => sections[k])}
      <footer className="hp-footer">
        <p className="hp-footer-names">
          {inv.groom_name} &amp; {inv.bride_name}
        </p>
        <p>Cảm ơn bạn đã chung vui cùng chúng tôi {theme.motif}</p>
        {demo && <p className="hp-demo-badge">Bản demo — dữ liệu mẫu</p>}
      </footer>
    </div>
  )
}
