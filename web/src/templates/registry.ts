import type { ComponentType } from 'react'
import type { RenderData } from '../types'
import type { Theme } from './themes'
import { pinkTheme, redTheme, greenTheme, goldTheme, lavenderTheme, burgundyTheme } from './themes'
import HongPastel01 from './HongPastel01'
import DoTruyenThong01 from './DoTruyenThong01'
import XanhThienNhien01 from './XanhThienNhien01'
import KemGold01 from './KemGold01'
import TimLavender01 from './TimLavender01'
import BurgundyVintage01 from './BurgundyVintage01'

export type TemplateComponent = ComponentType<{ data: RenderData }>

export const templateRegistry: Record<string, TemplateComponent> = {
  'hong-pastel-01': HongPastel01,
  'do-truyen-thong-01': DoTruyenThong01,
  'xanh-thien-nhien-01': XanhThienNhien01,
  'kem-gold-01': KemGold01,
  'tim-lavender-01': TimLavender01,
  'burgundy-vintage-01': BurgundyVintage01,
}

export function resolveTemplate(key?: string | null): TemplateComponent {
  return (key && templateRegistry[key]) || HongPastel01
}

// Theme của từng mẫu, tra được TỪ BÊN NGOÀI renderer.
// Dùng cho những khung bao quanh thiệp (thanh trang xem trước) để chúng ăn
// theo tông của mẫu đang xem, thay vì cứng màu hồng.
// Thêm mẫu mới thì khai ở CẢ HAI map dưới đây — cùng một khoá component_key.
export const themeRegistry: Record<string, Theme> = {
  'hong-pastel-01': pinkTheme,
  'do-truyen-thong-01': redTheme,
  'xanh-thien-nhien-01': greenTheme,
  'kem-gold-01': goldTheme,
  'tim-lavender-01': lavenderTheme,
  'burgundy-vintage-01': burgundyTheme,
}

export function resolveTheme(key?: string | null): Theme {
  return (key && themeRegistry[key]) || pinkTheme
}
