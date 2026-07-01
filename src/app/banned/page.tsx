import Link from 'next/link'
import { deleteSession } from '@/lib/session'
import { redirect } from 'next/navigation'

async function handleLogout() {
  'use server'
  await deleteSession()
  redirect('/auth/login')
}

export default function BannedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0F0F10' }}>
      {/* Ambient background glow */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(ellipse, rgba(239,68,68,0.08) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      <div
        className="relative w-full max-w-md rounded-[28px] p-8 text-center"
        style={{
          background: 'rgba(30,30,31,0.95)',
          border: '1px solid rgba(239,68,68,0.20)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.80), 0 0 0 1px rgba(239,68,68,0.10)',
        }}
      >
        {/* Top accent */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] rounded-t-[28px]"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.8) 35%, rgba(239,68,68,0.8) 65%, transparent)' }}
          aria-hidden="true"
        />

        {/* Icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.20)' }}
        >
          <svg
            className="w-10 h-10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ color: '#EF4444' }}
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        </div>

        {/* Heading */}
        <h1
          className="font-heading text-2xl font-bold mb-2"
          style={{ color: '#F5F5F5' }}
        >
          Account Suspended
        </h1>

        <p className="text-sm leading-relaxed mb-2" style={{ color: '#A1A1AA' }}>
          Your account has been suspended due to violations of our community guidelines.
        </p>
        <p className="text-sm leading-relaxed mb-8" style={{ color: '#71717A' }}>
          You can still log in, but you no longer have access to any features. If you believe this is a mistake, please contact our support team.
        </p>

        {/* Support link */}
        <div
          className="rounded-2xl p-4 mb-6 text-left"
          style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)' }}
        >
          <p className="text-xs font-semibold mb-1" style={{ color: '#EF4444' }}>Need help?</p>
          <p className="text-xs" style={{ color: '#71717A' }}>
            Contact us at{' '}
            <span className="font-medium" style={{ color: '#A1A1AA' }}>
              support@cookreels.com
            </span>
            {' '}and include your username in the subject line.
          </p>
        </div>

        {/* Logout action */}
        <form action={handleLogout}>
          <button
            type="submit"
            className="w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
            style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.25)',
              color: '#F87171',
            }}
          >
            Sign Out
          </button>
        </form>

        {/* Brand mark */}
        <p className="mt-6 text-xs" style={{ color: '#3F3F46' }}>
          CookReels — Community Guidelines Enforcement
        </p>
      </div>
    </div>
  )
}
