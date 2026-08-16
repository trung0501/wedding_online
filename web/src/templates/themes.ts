// Theme cho renderer: mỗi mẫu = BaseTemplate + 1 theme (màu, font, hoạ tiết + BỐ CỤC).
export type HeroVariant = 'cover' | 'split' | 'minimal'
export type EventsVariant = 'cards' | 'timeline'
export type SectionKey = 'story' | 'events' | 'album' | 'rsvp' | 'gift'

export interface Theme {
  bg: string
  cream: string
  primary: string
  primarySoft: string
  deep: string
  text: string
  muted: string
  line: string
  heroOverlay: string // 2 màu rgba, đặt trong linear-gradient(...)
  heading: string
  body: string
  motif: string
  eyebrow: string
  // Bố cục
  heroVariant: HeroVariant
  eventsVariant: EventsVariant
  order: SectionKey[] // thứ tự các section giữa hero và footer
}

export const pinkTheme: Theme = {
  bg: '#fff7f9',
  cream: '#fffdfb',
  primary: '#c96b83',
  primarySoft: '#e9a6b5',
  deep: '#8f4256',
  text: '#5f4a50',
  muted: '#9c8890',
  line: '#f0d4dc',
  heroOverlay: 'rgba(120,60,75,.30), rgba(120,60,75,.50)',
  heading: "'Playfair Display', Georgia, serif",
  body: "'Be Vietnam Pro', system-ui, sans-serif",
  motif: '♥',
  eyebrow: 'Trân trọng kính mời',
  heroVariant: 'cover',
  eventsVariant: 'cards',
  order: ['story', 'events', 'album', 'rsvp', 'gift'],
}

export const redTheme: Theme = {
  bg: '#fdf6f2',
  cream: '#fffdf8',
  primary: '#c0392b',
  primarySoft: '#e0a96d',
  deep: '#7a1f1f',
  text: '#4a3b34',
  muted: '#9c8579',
  line: '#ecdcc9',
  heroOverlay: 'rgba(70,20,20,.42), rgba(70,20,20,.58)',
  heading: "'Playfair Display', Georgia, serif",
  body: "'Be Vietnam Pro', system-ui, sans-serif",
  motif: '囍',
  eyebrow: 'Lễ Thành Hôn',
  heroVariant: 'cover',
  eventsVariant: 'timeline',
  order: ['story', 'events', 'gift', 'album', 'rsvp'],
}

export const greenTheme: Theme = {
  bg: '#f5f9f3',
  cream: '#fdfefb',
  primary: '#5b7f5a',
  primarySoft: '#9cbf8f',
  deep: '#33562f',
  text: '#45503f',
  muted: '#8a998a',
  line: '#d9e6d3',
  heroOverlay: 'rgba(30,50,30,.32), rgba(30,50,30,.52)',
  heading: "'Lora', Georgia, serif",
  body: "'Be Vietnam Pro', system-ui, sans-serif",
  motif: '❦',
  eyebrow: 'Save the date',
  heroVariant: 'split',
  eventsVariant: 'cards',
  order: ['story', 'events', 'album', 'rsvp', 'gift'],
}

export const goldTheme: Theme = {
  bg: '#fbf8f2',
  cream: '#fffef9',
  primary: '#b98a3e',
  primarySoft: '#d9bd85',
  deep: '#6f5423',
  text: '#55493a',
  muted: '#9c9078',
  line: '#ece2cf',
  heroOverlay: 'rgba(60,48,22,.34), rgba(60,48,22,.54)',
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Be Vietnam Pro', system-ui, sans-serif",
  motif: '✦',
  eyebrow: 'Trân trọng kính mời',
  heroVariant: 'minimal',
  eventsVariant: 'timeline',
  order: ['story', 'album', 'events', 'gift', 'rsvp'],
}

// Tổ hợp bố cục split + timeline (chưa mẫu nào dùng).
export const lavenderTheme: Theme = {
  bg: '#faf7fd',
  cream: '#fffdff',
  primary: '#8a6bb1',
  primarySoft: '#c4addf',
  deep: '#573a80',
  text: '#544b60',
  muted: '#948ca4',
  line: '#e6dcf2',
  heroOverlay: 'rgba(66,44,92,.28), rgba(66,44,92,.50)',
  heading: "'Cormorant Garamond', Georgia, serif",
  body: "'Be Vietnam Pro', system-ui, sans-serif",
  motif: '❀',
  eyebrow: 'Chúng mình cưới',
  heroVariant: 'split',
  eventsVariant: 'timeline',
  order: ['events', 'story', 'album', 'rsvp', 'gift'],
}

// Tổ hợp bố cục minimal + cards (chưa mẫu nào dùng).
export const burgundyTheme: Theme = {
  bg: '#fbf6f4',
  cream: '#fffcfa',
  primary: '#8c2f3b',
  primarySoft: '#c58a7d',
  deep: '#5a1a24',
  text: '#4e3c39',
  muted: '#98827e',
  line: '#ebd9d3',
  heroOverlay: 'rgba(58,18,26,.38), rgba(58,18,26,.58)',
  heading: "'Lora', Georgia, serif",
  body: "'Be Vietnam Pro', system-ui, sans-serif",
  motif: '❧',
  eyebrow: 'Trân trọng báo tin',
  heroVariant: 'minimal',
  eventsVariant: 'cards',
  order: ['story', 'events', 'album', 'gift', 'rsvp'],
}
