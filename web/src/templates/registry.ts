import type { ComponentType } from 'react'
import type { RenderData } from '../types'
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
