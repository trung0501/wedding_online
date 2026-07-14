import { Routes, Route } from 'react-router-dom'
import { sampleInvitation } from './data/sampleInvitation'
import { resolveTemplate } from './templates/registry'
import InvitationPage from './pages/InvitationPage'
import GalleryPage from './pages/GalleryPage'
import TemplatePreview from './pages/TemplatePreview'
import OrderPlaceholder from './pages/OrderPlaceholder'

function DemoHost() {
  const Template = resolveTemplate(sampleInvitation.template?.component_key)
  return <Template data={sampleInvitation} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GalleryPage />} />
      <Route path="/demo" element={<DemoHost />} />
      <Route path="/mau/:slug" element={<TemplatePreview />} />
      <Route path="/dat-thiep" element={<OrderPlaceholder />} />
      <Route path="/:slug" element={<InvitationPage />} />
    </Routes>
  )
}
