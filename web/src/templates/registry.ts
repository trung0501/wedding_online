import type { ComponentType } from 'react'
import type { RenderData } from '../types'
import HongPastel01 from './HongPastel01'

export type TemplateComponent = ComponentType<{ data: RenderData }>

// Map component_key (lưu trong templates) → component React tương ứng.
export const templateRegistry: Record<string, TemplateComponent> = {
  'hong-pastel-01': HongPastel01,
}

export function resolveTemplate(key?: string | null): TemplateComponent {
  return (key && templateRegistry[key]) || HongPastel01
}
