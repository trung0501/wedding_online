import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchInvitationBySlug } from '../lib/api'
import { resolveTemplate } from '../templates/registry'
import type { RenderData } from '../types'

type State = { loading: boolean; data: RenderData | null; error: boolean }

export default function InvitationPage() {
  const { slug } = useParams()
  const [state, setState] = useState<State>({ loading: true, data: null, error: false })

  useEffect(() => {
    let alive = true
    setState({ loading: true, data: null, error: false })
    fetchInvitationBySlug(slug ?? '')
      .then((data) => alive && setState({ loading: false, data, error: false }))
      .catch(() => alive && setState({ loading: false, data: null, error: true }))
    return () => {
      alive = false
    }
  }, [slug])

  if (state.loading) return <div className="hp-center">Đang tải thiệp…</div>
  if (state.error || !state.data) return <div className="hp-center">Không tìm thấy thiệp này ♥</div>

  const Template = resolveTemplate(state.data.template?.component_key)
  return <Template data={state.data} />
}
