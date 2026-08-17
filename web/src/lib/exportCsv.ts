// ============================================================
//  Xuất danh sách khách mời ra file CSV mở được bằng Excel.
//
//  Điểm dễ sai nhất: Excel trên Windows KHÔNG tự nhận UTF-8. Không có
//  BOM ở đầu file thì "Nguyễn Văn An" mở ra thành "Nguyá»…n VÄƒn An".
//  Vì vậy chuỗi luôn bắt đầu bằng ﻿.
// ============================================================

import type { Rsvp, GuestbookEntry } from '../types'

const attendingLabel: Record<string, string> = { yes: 'Tham dự', no: 'Không đến', maybe: 'Chưa chắc' }
const sideLabel: Record<string, string> = { groom: 'Nhà trai', bride: 'Nhà gái', both: 'Cả hai' }

// Excel hiểu dấu " bên trong ô là ký tự thoát kép.
function cell(value: unknown): string {
  const s = value == null ? '' : String(value)
  return `"${s.replace(/"/g, '""')}"`
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function exportGuestList(rsvps: Rsvp[], guestbook: GuestbookEntry[], coupleName: string) {
  const rows: string[] = []

  rows.push(['Tên khách', 'Tham dự', 'Số người', 'Bên', 'Lời chúc', 'Thời gian'].map(cell).join(','))

  for (const r of rsvps) {
    rows.push(
      [
        r.name,
        r.attending ? attendingLabel[r.attending] ?? r.attending : '',
        // num_guests = 0 vẫn tính 1 người, khớp với con số hiển thị trên trang.
        r.attending === 'yes' ? r.num_guests || 1 : 0,
        r.side ? sideLabel[r.side] ?? r.side : '',
        r.message ?? '',
        fmtDate(r.date_created),
      ]
        .map(cell)
        .join(','),
    )
  }

  // Lời chúc ghi thẳng vào sổ lưu bút (không kèm RSVP) cũng phải có mặt,
  // nếu không danh sách xuất ra sẽ thiếu so với con số trên màn hình.
  for (const g of guestbook) {
    if (!g.message?.trim()) continue
    rows.push([g.name, '(chỉ gửi lời chúc)', 0, '', g.message, fmtDate(g.date_created)].map(cell).join(','))
  }

  const today = new Date().toISOString().slice(0, 10)
  download(`khach-moi-${slugify(coupleName) || 'thiep'}-${today}.csv`, '﻿' + rows.join('\r\n'))
}
