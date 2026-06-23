'use client'

import { useState, useEffect } from 'react'

const SLIDES = [
  '/images/signup1.png',
  '/images/signup3.png',
  '/images/signup2.png',
  '/images/signup4.png',
]

export default function BackgroundSlider() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % SLIDES.length)
    }, 2000)
    return () => clearInterval(id)
  }, [])

  return (
    <>
      {SLIDES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-[1200ms] ease-in-out"
          style={{
            backgroundImage: `url('${src}')`,
            opacity: i === active ? 1 : 0,
            zIndex: i === active ? 1 : 0,
          }}
          aria-hidden="true"
        />
      ))}

      {/* Slide indicator dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10" aria-hidden="true">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={[
              'rounded-full transition-all duration-200',
              i === active
                ? 'w-5 h-1.5 bg-[#F5C518]'
                : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/50',
            ].join(' ')}
          />
        ))}
      </div>
    </>
  )
}
