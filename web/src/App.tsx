import { Routes, Route, useParams } from 'react-router-dom'
import { sampleInvitation } from './data/sampleInvitation'
import { resolveTemplate } from './templates/registry'
import SiteLayout from './components/SiteLayout'
import HomePage from './pages/HomePage'
import GalleryPage from './pages/GalleryPage'
import ServicesPage from './pages/ServicesPage'
import ContactPage from './pages/ContactPage'
import IntakePage from './pages/IntakePage'
import TemplatePreview from './pages/TemplatePreview'
import InvitationPage from './pages/InvitationPage'

function DemoHost() {
  const Template = resolveTemplate(sampleInvitation.template?.component_key)
  return <Template data={sampleInvitation} />
}

// Render 1 mẫu bất kỳ bằng dữ liệu mẫu, KHÔNG cần Directus.
// Dùng để xem nhanh mẫu khi dev offline.
function ThumbHost() {
  const { key } = useParams()
  const Template = resolveTemplate(key)
  return <Template data={sampleInvitation} />
}

export default function App() {
  return (
    <Routes>
      {/* Trang bán hàng — có header, footer, nút liên hệ nổi */}
      <Route element={<SiteLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/kho-mau-thiep" element={<GalleryPage />} />
        <Route path="/goi-dich-vu" element={<ServicesPage />} />
        <Route path="/lien-he" element={<ContactPage />} />
        <Route path="/dat-thiep" element={<IntakePage />} />
      </Route>

      {/* Xem trước mẫu — có thanh riêng, không dùng header trang bán hàng */}
      <Route path="/mau/:slug" element={<TemplatePreview />} />

      {/* Render bằng dữ liệu mẫu, không cần Directus */}
      <Route path="/demo" element={<DemoHost />} />
      <Route path="/_thumb/:key" element={<ThumbHost />} />

      {/* Thiệp thật của khách — chiếm trọn màn hình, TUYỆT ĐỐI không bọc header */}
      <Route path="/:slug" element={<InvitationPage />} />
    </Routes>
  )
}
