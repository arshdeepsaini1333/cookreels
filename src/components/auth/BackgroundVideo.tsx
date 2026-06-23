'use client'

export default function BackgroundVideo() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover animate-video-zoom"
      >
        <source src="/images/login.mp4" type="video/mp4" />
      </video>
    </div>
  )
}
