import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AdminLoginForm } from '@/components/admin/forms/AdminLoginForm'

export const metadata: Metadata = {
  title: 'Admin Login | CookReels',
  description: 'Sign in to the CookReels Admin Dashboard.',
}

export default function AdminLoginPage() {
  return (
    <div
      className="noise-overlay relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10"
      style={{ background: 'linear-gradient(180deg, #1A1A1B 0%, #0F0F10 100%)' }}
    >
      {/* Ambient glow blobs */}
      <div
        className="animate-blob pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full opacity-[0.14] blur-[100px]"
        style={{ background: 'radial-gradient(circle, #F5C518 0%, transparent 70%)' }}
        aria-hidden="true"
      />
      <div
        className="animate-blob-alt pointer-events-none absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full opacity-[0.12] blur-[110px]"
        style={{ background: 'radial-gradient(circle, #FF9F1C 0%, transparent 70%)' }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.05] blur-[140px]"
        style={{ background: 'radial-gradient(circle, #F5C518 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      {/* Dot grid texture */}
      <div
        className="pointer-events-none absolute inset-0 dot-grid opacity-[0.04]"
        style={{ color: '#F5C518' }}
        aria-hidden="true"
      />

      {/* Back to CookReels */}
      <Link
        href="/"
        className="absolute left-5 top-5 z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-white/35 transition-colors hover:text-white/70 sm:left-8 sm:top-8"
      >
        <ArrowLeft size={13} strokeWidth={2} />
        Back to CookReels
      </Link>

      <div className="relative z-10 flex flex-col items-center">
        <AdminLoginForm />

        <p className="mt-7 text-center text-[11px] text-white/25">
          &copy; {new Date().getFullYear()} CookReels &middot; Admin Portal
        </p>
      </div>
    </div>
  )
}
