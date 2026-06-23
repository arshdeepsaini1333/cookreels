'use client'

import BackgroundSlider from './BackgroundSlider'
import BrandingSection from './BrandingSection'
import SignupForm from './SignupForm'

export default function SignupPage({ onSubmit }: any) {
  return (
    <div className="relative min-h-screen bg-stone-950">
      {/* Auto-rotating food background images */}
      <BackgroundSlider />

      {/* Layered overlays — left side darker for readability, right side lighter to let card pop */}
      <div className="absolute inset-0 z-[2] bg-gradient-to-r from-black/88 via-black/70 to-black/40" aria-hidden="true" />
      <div className="absolute inset-0 z-[2] bg-gradient-to-b from-black/20 via-transparent to-black/40" aria-hidden="true" />
      <div className="absolute inset-0 z-[2] bg-[#f6c68b]/[0.025]" aria-hidden="true" />

      {/* Page content */}
      <div className="relative z-10 flex min-h-screen">
        {/* Left: branding panel (desktop only) */}
        <BrandingSection />

        {/* Right: form */}
        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <SignupForm onSubmit={onSubmit}/>
        </div>
      </div>
    </div>
  )
}
