// Schema Directus dùng cho SDK typing — khớp với script directus/bootstrap-schema.mjs.
// Trường M2O lưu id (uuid) của bản ghi liên kết; khi cần dữ liệu đầy đủ thì dùng fields[]/deep của SDK.

export interface Brief {
  id: string
  contact_name: string | null
  contact_phone: string | null
  contact_channel: string | null
  template: string | null
  groom_name: string | null
  bride_name: string | null
  event_info: string | null
  wish: string | null
  status: 'new' | 'in_progress' | 'quoted' | 'paid' | 'delivered' | 'canceled'
  invitation: string | null
  date_created: string | null
}

export interface BriefPhoto {
  id: string
  brief: string | null
  image: string | null
  sort: number
}

export interface Order {
  id: string
  invitation: string | null
  brief: string | null
  amount: number | null
  status: 'pending' | 'paid' | 'canceled'
  method: string | null
  paid_at: string | null
  note: string | null
  date_created: string | null
}

export interface TemplateCategory {
  id: string
  name: string
  slug: string
  sort: number
}

export interface Template {
  id: string
  name: string
  slug: string
  description: string | null
  category: string | null
  thumbnail: string | null
  component_key: string | null
  style_tokens: Record<string, unknown> | null
  default_sections: unknown | null
  badge: 'none' | 'hot' | 'new'
  is_active: boolean
  sort: number
  price: number
}

export interface Invitation {
  id: string
  owner: string | null
  template: string | null
  status: 'draft' | 'review' | 'approved' | 'published' | 'archived'
  groom_name: string | null
  groom_full_name: string | null
  groom_father: string | null
  groom_mother: string | null
  bride_name: string | null
  bride_full_name: string | null
  bride_father: string | null
  bride_mother: string | null
  cover_photo: string | null
  couple_photo: string | null
  love_story: string | null
  settings: Record<string, unknown> | null
  published_at: string | null
  date_created: string | null
  date_updated: string | null
}

export interface InvitationVariant {
  id: string
  invitation: string | null
  variant_type: 'combined' | 'groom' | 'bride'
  slug: string
  display_config: Record<string, unknown> | null
}

export interface EventItem {
  id: string
  invitation: string | null
  event_type: 'le_vu_quy' | 'le_tan_hon' | 'le_thanh_hon' | 'tiec_cuoi' | null
  title: string | null
  event_at: string | null
  venue_name: string | null
  address: string | null
  map_lat: number | null
  map_lng: number | null
  map_url: string | null
  side: 'groom' | 'bride' | 'both'
  sort: number
}

export interface Photo {
  id: string
  invitation: string | null
  image: string | null
  caption: string | null
  sort: number
}

export interface Guest {
  id: string
  invitation: string | null
  name: string | null
  salutation: string | null
  side: 'groom' | 'bride' | 'both'
  tag: string | null
  token: string | null
  phone: string | null
  note: string | null
}

export interface Rsvp {
  id: string
  invitation: string | null
  guest: string | null
  name: string | null
  attending: 'yes' | 'no' | 'maybe' | null
  num_guests: number
  side: 'groom' | 'bride' | null
  message: string | null
  date_created: string | null
}

export interface GuestbookEntry {
  id: string
  invitation: string | null
  guest: string | null
  name: string | null
  message: string | null
  status: 'pending' | 'approved'
  date_created: string | null
}

export interface GiftAccount {
  id: string
  invitation: string | null
  side: 'groom' | 'bride' | null
  bank_name: string | null
  account_number: string | null
  account_holder: string | null
  qr_image: string | null
}

export interface InvitationView {
  id: string
  invitation: string | null
  variant: string | null
  guest: string | null
  date_created: string | null
  user_agent: string | null
}

export interface Schema {
  briefs: Brief[]
  brief_photos: BriefPhoto[]
  orders: Order[]
  template_categories: TemplateCategory[]
  templates: Template[]
  invitations: Invitation[]
  invitation_variants: InvitationVariant[]
  events: EventItem[]
  photos: Photo[]
  guests: Guest[]
  rsvps: Rsvp[]
  guestbook: GuestbookEntry[]
  gift_accounts: GiftAccount[]
  invitation_views: InvitationView[]
}
