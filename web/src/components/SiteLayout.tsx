import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import SiteHeader from './SiteHeader'
import SiteFooter from './SiteFooter'
import FloatingContact from './FloatingContact'
import { ConsultProvider } from './ConsultModal'
import '../site.css'

// Khung chung cho CÁC TRANG BÁN HÀNG (trang chủ, kho mẫu, gói dịch vụ, liên hệ, đặt thiệp).
// Cố tình KHÔNG bọc renderer thiệp /:slug và trang xem trước /mau/:slug —
// thiệp cưới phải chiếm trọn màn hình, không có header của nhà cung cấp.
export default function SiteLayout() {
  const { pathname } = useLocation()

  // Chuyển trang thì về đầu trang, nếu không router giữ nguyên vị trí cuộn cũ.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <ConsultProvider>
      <div className="sl">
        <SiteHeader />
        <main className="sl-main">
          <Outlet />
        </main>
        <SiteFooter />
        <FloatingContact />
      </div>
    </ConsultProvider>
  )
}
