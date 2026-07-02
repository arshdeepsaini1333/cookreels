import type { Prisma } from '@/generated/prisma'
import type { Audience, AudienceLocation } from '@/types/campaign'

export type AudienceRow = {
  id: string; name: string; gender: string; ageMin: number; ageMax: number
  locations: Prisma.JsonValue; interests: string[]; behaviours: string[]
  deviceType: string; os: string; createdAt: Date; updatedAt: Date
}

export function serializeAudience(a: AudienceRow): Audience {
  return {
    id:         a.id,
    name:       a.name,
    gender:     a.gender as Audience['gender'],
    ageMin:     a.ageMin,
    ageMax:     a.ageMax,
    locations:  (a.locations as AudienceLocation[] | null) ?? [],
    interests:  a.interests,
    behaviours: a.behaviours,
    deviceType: a.deviceType as Audience['deviceType'],
    os:         a.os as Audience['os'],
    createdAt:  a.createdAt.toISOString(),
    updatedAt:  a.updatedAt.toISOString(),
  }
}
