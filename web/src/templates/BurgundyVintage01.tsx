import BaseTemplate from './BaseTemplate'
import { burgundyTheme } from './themes'
import type { RenderData } from '../types'

export default function BurgundyVintage01({ data }: { data: RenderData }) {
  return <BaseTemplate data={data} theme={burgundyTheme} />
}
