import { Routes, Route } from 'react-router-dom'
import { sampleInvitation } from './data/sampleInvitation'
import { resolveTemplate } from './templates/registry'
import InvitationPage from './pages/InvitationPage'

function DemoHost() {
  const Template = resolveTemplate(sampleInvitation.template?.component_key)
  return <Template data={sampleInvitation} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<DemoHost />} />
      <Route path="/demo" element={<DemoHost />} />
      <Route path="/:slug" element={<InvitationPage />} />
    </Routes>
  )
}
