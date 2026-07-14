import BaseTemplate from './BaseTemplate'
import { goldTheme } from './themes'
import type { RenderData } from '../types'

export default function KemGold01({ data }: { data: RenderData }) {
  return <BaseTemplate data={data} theme={goldTheme} />
}
