import BaseTemplate from './BaseTemplate'
import { greenTheme } from './themes'
import type { RenderData } from '../types'

export default function XanhThienNhien01({ data }: { data: RenderData }) {
  return <BaseTemplate data={data} theme={greenTheme} />
}
