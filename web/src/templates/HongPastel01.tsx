import BaseTemplate from './BaseTemplate'
import { pinkTheme } from './themes'
import type { RenderData } from '../types'

export default function HongPastel01({ data }: { data: RenderData }) {
  return <BaseTemplate data={data} theme={pinkTheme} />
}
