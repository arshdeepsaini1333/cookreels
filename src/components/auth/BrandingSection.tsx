import type { ReactNode } from 'react'

type Feature = {
  icon: ReactNode
  label: string
}

const features: Feature[] = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-[#F5C518]">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" />
      </svg>
    ),
    label: 'Create stunning cooking reels in minutes',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-[#F5C518]">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
    label: 'Share recipes with a vibrant community',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-[#F5C518]">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
    label: 'Discover trending dishes worldwide',
  },
]

export default function BrandingSection() {
  return (
    <div className="hidden lg:flex flex-col justify-center w-[44%] px-10 xl:px-16 py-10 animate-fade-in" style={{ marginTop: '-48px' }}>

      {/* Logo */}
      <div style={{ marginBottom: '28px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/cookreels_ligt_logo.png" alt="CookReels" className="h-14 xl:h-16 object-contain" />
      </div>

      {/* Brand description */}
      <p
        className="animate-fade-in"
        style={{
          fontFamily: 'var(--font-manrope), sans-serif',
          fontSize: 'clamp(0.95rem, 1.35vw, 1.15rem)',
          fontWeight: 400,
          color: 'rgba(255, 255, 255, 0.80)',
          lineHeight: 1.75,
          maxWidth: '460px',
          animationDelay: '0.2s',
          animationFillMode: 'both',
        }}
      >
        Join the home of food creators where every recipe becomes a story worth sharing.
      </p>

      {/* Accent line */}
      <div
        className="flex items-center gap-3 mt-9 xl:mt-11 mb-7 xl:mb-9 animate-fade-in"
        style={{ animationDelay: '0.38s', animationFillMode: 'both' }}
      >
        <div className="h-px w-14 bg-[#F5C518]/60 rounded-full" />
        <div className="h-px w-7 bg-white/15 rounded-full" />
        <div className="h-px w-3 bg-white/8 rounded-full" />
      </div>

      {/* Feature list */}
      <div className="space-y-4">
        {features.map((feature, i) => (
          <div
            key={i}
            className="flex items-center gap-3.5 animate-slide-up"
            style={{ animationDelay: `${0.45 + i * 0.1}s`, animationFillMode: 'both' }}
          >
            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0">
              {feature.icon}
            </div>
            <span className="text-white/55 text-sm">{feature.label}</span>
          </div>
        ))}
      </div>

    </div>
  )
}
