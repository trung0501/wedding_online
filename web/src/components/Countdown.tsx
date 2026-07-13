import { useEffect, useState } from 'react'

function diff(target: number) {
  let d = Math.max(0, target - Date.now())
  const days = Math.floor(d / 86400000)
  d -= days * 86400000
  const hours = Math.floor(d / 3600000)
  d -= hours * 3600000
  const mins = Math.floor(d / 60000)
  d -= mins * 60000
  const secs = Math.floor(d / 1000)
  return { days, hours, mins, secs }
}

export default function Countdown({ date }: { date: string | null }) {
  const target = date ? new Date(date).getTime() : 0
  const [t, setT] = useState(() => diff(target))

  useEffect(() => {
    if (!target) return
    const id = setInterval(() => setT(diff(target)), 1000)
    return () => clearInterval(id)
  }, [target])

  if (!target) return null

  const items: Array<[number, string]> = [
    [t.days, 'Ngày'],
    [t.hours, 'Giờ'],
    [t.mins, 'Phút'],
    [t.secs, 'Giây'],
  ]

  return (
    <div className="hp-countdown">
      {items.map(([v, l]) => (
        <div className="hp-cd-item" key={l}>
          <span className="hp-cd-num">{String(v).padStart(2, '0')}</span>
          <span className="hp-cd-label">{l}</span>
        </div>
      ))}
    </div>
  )
}
