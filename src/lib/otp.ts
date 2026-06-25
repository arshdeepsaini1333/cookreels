import { randomInt } from 'crypto'

export const OTP_EXPIRY_MINUTES = 10
export const OTP_RESEND_COOLDOWN_SECONDS = 60
export const OTP_MAX_ATTEMPTS = 5

export function generateOTP(): string {
  return String(randomInt(100000, 999999))
}

export function getOtpExpiry(): Date {
  const d = new Date()
  d.setMinutes(d.getMinutes() + OTP_EXPIRY_MINUTES)
  return d
}
