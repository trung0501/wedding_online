import BaseTemplate from './BaseTemplate'
import { lavenderTheme } from './themes'
import type { RenderData } from '../types'

export default function TimLavender01({ data }: { data: RenderData }) {
  return <BaseTemplate data={data} theme={lavenderTheme} />
}
