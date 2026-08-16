import { Routes, Route, useParams } from 'react-router-dom'
import { sampleInvitation } from './data/sampleInvitation'
import { resolveTemplate } from './templates/registry'
import InvitationPage from './pages/InvitationPage'
import GalleryPage from './pages/GalleryPage'
import TemplatePreview from './pages/TemplatePreview'
import IntakePage from './pages/IntakePage'

function DemoHost() {
  const Template = resolveTemplate(sampleInvitation.template?.component_key)
  return <Template data={sampleInvitation} />
}

// Render 1 mẫu bất kỳ bằng dữ liệu mẫu, KHÔNG cần Directus.
// Dùng cho script chụp thumbnail (tools/gen-thumbnails.mjs) và để xem nhanh mẫu khi dev offline.
function ThumbHost() {
  const { key } = useParams()
  const Template = resolveTemplate(key)
  return <Template data={sampleInvitation} />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<GalleryPage />} />
      <Route path="/demo" element={<DemoHost />} />
      <Route path="/_thumb/:key" element={<ThumbHost />} />
      <Route path="/mau/:slug" element={<TemplatePreview />} />
      <Route path="/dat-thiep" element={<IntakePage />} />
      <Route path="/:slug" element={<InvitationPage />} />
    </Routes>
  )
}
