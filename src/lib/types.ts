// Domain types for Quote My Tattoo. These mirror the SQL schema in
// supabase/migrations/0001_init.sql. Once the Supabase project exists we can
// replace/augment these with `supabase gen types typescript`.

export type UserRole = "customer" | "artist" | "studio_owner";
export type RequestStatus = "draft" | "live" | "booked" | "closed";
export type SizeCategory = "tiny" | "small" | "medium" | "large" | "sleeve";
export type QuoteStatus = "pending" | "accepted" | "declined" | "withdrawn";
export type MatchStatus = "notified" | "viewed" | "responded" | "declined";
export type IdStatus = "pending" | "approved" | "rejected";
export type MembershipPlan = "free" | "artist_pro" | "studio_pro";
export type InviteStatus = "pending" | "accepted" | "expired";
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export interface Profile {
  id: string;
  role: UserRole;
  name: string | null;
  email: string | null;
  phone: string | null;
  postcode: string | null;
  notification_settings: Record<string, unknown>;
  created_at: string;
}

export interface Studio {
  id: string;
  owner_profile_id: string | null;
  name: string;
  slug: string | null;
  location_postcode: string | null;
  location_area: string | null;
  bio: string | null;
  membership_plan: MembershipPlan;
  is_founding_member: boolean;
  founding_number: number | null;
  created_at: string;
}

export interface Artist {
  id: string;
  profile_id: string | null;
  display_name: string | null;
  slug: string | null;
  bio: string | null;
  primary_style: string | null;
  styles: string[];
  studio_id: string | null;
  location_postcode: string | null;
  location_area: string | null;
  travel_areas: string[];
  instagram_url: string | null;
  tiktok_url: string | null;
  social_embeds: string[];
  insured: boolean;
  licensed: boolean;
  hygiene_certified: boolean;
  first_aid: boolean;
  id_status: IdStatus;
  verified: boolean;
  profile_complete: boolean;
  response_rate: number | null;
  rating: number;
  review_count: number;
  membership_plan: MembershipPlan;
  is_founding_member: boolean;
  founding_number: number | null;
  created_at: string;
}

export interface PortfolioImage {
  id: string;
  artist_id: string;
  storage_path: string;
  position: number;
  created_at: string;
}

export interface TattooRequest {
  id: string;
  customer_id: string;
  title: string | null;
  note: string | null;
  placement_zone: string | null;
  placement_view: string | null;
  size_category: SizeCategory | null;
  style: string | null;
  budget_min: number | null;
  budget_max: number | null;
  location_text: string | null;
  location_postcode: string | null;
  location_area: string | null;
  status: RequestStatus;
  created_at: string;
  updated_at: string;
}

export interface RequestImage {
  id: string;
  request_id: string;
  storage_path: string;
  kind: "reference";
  created_at: string;
}

export interface RequestMatch {
  id: string;
  request_id: string;
  artist_id: string;
  matched_on: string | null;
  notified_at: string | null;
  status: MatchStatus;
  created_at: string;
}

export interface Quote {
  id: string;
  request_id: string;
  artist_id: string;
  price_estimate: number | null;
  price_note: string | null;
  message: string | null;
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  request_id: string;
  customer_id: string;
  artist_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  body: string;
  created_at: string;
  read_at: string | null;
}

export interface Booking {
  id: string;
  request_id: string;
  artist_id: string;
  quote_id: string | null;
  scheduled_for: string | null;
  status: BookingStatus;
  created_at: string;
}

export interface Review {
  id: string;
  request_id: string;
  artist_id: string;
  customer_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  artist_reply: string | null;
  created_at: string;
}
