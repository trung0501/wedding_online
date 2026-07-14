import BaseTemplate from './BaseTemplate'
import { redTheme } from './themes'
import type { RenderData } from '../types'

export default function DoTruyenThong01({ data }: { data: RenderData }) {
  return <BaseTemplate data={data} theme={redTheme} />
}
