import type { CampaignObjective, CampaignStatus, PaymentStatus } from '@/generated/prisma'

// ─── Re-exports ───────────────────────────────────────────────────────────────
export type { CampaignObjective, CampaignStatus, PaymentStatus }

// ─── Audience data stored in the JSON column ─────────────────────────────────
export interface GeofenceZone {
  id: string
  name: string
  lat: string
  lng: string
  radius: string
}

export interface AudienceData {
  platform?: string
  adFormat?: 'banner' | 'reel'
  description?: string
  state?: string
  city?: string
  languages?: string[]
  interests?: string[]
  geofences?: GeofenceZone[]
  impressions?: number
  budgetType?: 'daily' | 'lifetime'
  timezone?: string
  ctaText?: string
  destinationUrl?: string
}

// ─── Request bodies ───────────────────────────────────────────────────────────
export interface CreateCampaignBody {
  name: string
  reelId?: string
  objective: CampaignObjective
  audienceData: AudienceData
  locations: string[]
  ageMin?: number
  ageMax?: number
  gender?: string
  durationDays: number
  dailyBudget: number
  totalBudget: number
  startDate?: string
  endDate?: string
}

export interface UpdateCampaignBody extends Partial<CreateCampaignBody> {}

export interface CreateOrderBody {
  campaignId: string
}

export interface VerifyPaymentBody {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
  paymentId: string
}

// ─── API response shapes ──────────────────────────────────────────────────────
export interface CampaignListItem {
  id: string
  name: string
  objective: CampaignObjective
  status: CampaignStatus
  totalBudget: number
  dailyBudget: number
  durationDays: number
  startDate: string | null
  endDate: string | null
  reelId: string | null
  reelThumbnail: string | null
  platform: string
  analytics: CampaignAnalyticsSummary | null
  paymentId: string | null
  createdAt: string
  updatedAt: string
}

export interface CampaignAnalyticsSummary {
  impressions: number
  views: number
  likes: number
  clicks: number
  followersGained: number
  spend: number
}

export interface CampaignDetail extends CampaignListItem {
  audienceData: AudienceData
  locations: string[]
  ageMin: number | null
  ageMax: number | null
  gender: string | null
  payment: PaymentDetail | null
}

export interface PaymentDetail {
  id: string
  razorpayOrderId: string | null
  razorpayPaymentId: string | null
  amount: number
  currency: string
  status: PaymentStatus
  paymentMethod: string | null
  createdAt: string
}

export interface CreateOrderResponse {
  orderId: string
  amount: number
  currency: string
  paymentId: string
  keyId: string
  campaignName: string
}

export interface BoostStats {
  activeCampaigns: number
  draftCampaigns: number
  totalImpressions: number
  totalClicks: number
  totalSpend: number
  totalLeads: number
  campaigns: BoostCampaignRow[]
}

export interface BoostCampaignRow {
  id: string
  name: string
  platform: string
  status: 'active' | 'pending' | 'draft' | 'completed' | 'rejected'
  budget: number
  impressions: number
  clicks: number
  createdAt: string
}
