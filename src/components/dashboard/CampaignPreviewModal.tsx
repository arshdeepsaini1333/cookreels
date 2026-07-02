'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Image as ImageIcon, Video, Loader2, Smartphone, Film } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { CampaignDetail, AudienceData } from '@/types/campaign'
import { ProtectedImg, ProtectedVideo } from '@/components/shared/ProtectedMedia'

interface Props {
  campaignId: string | null
  onClose: () => void
}

export default function CampaignPreviewModal({ campaignId, onClose }: Props) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true); return () => setMounted(false) }, [])

  const [detail,  setDetail]  = useState<CampaignDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'feed' | 'reel'>('feed')

  useEffect(() => {
    if (!campaignId) { setDetail(null); return }
    setLoading(true)
    fetch(`/api/campaigns/${campaignId}`)
      .then(r => r.json())
      .then((d: CampaignDetail) => {
        setDetail(d)
        setTab((d.audienceData as AudienceData)?.adFormat === 'reel' ? 'reel' : 'feed')
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [campaignId])

  if (!campaignId || !mounted) return null

  const ad          = (detail?.audienceData ?? {}) as AudienceData
  const isBanner     = ad.adFormat === 'banner'
  const bannerSrc    = detail?.bannerUrl  ?? ad.bannerUrl
  const videoSrc     = detail?.adVideoUrl ?? ad.adVideoUrl
  const mediaImage   = bannerSrc ?? detail?.reelThumbnail ?? undefined
  const hasVideo     = !!videoSrc
  const name         = detail?.name || 'Your Campaign'
  const heading      = ad.adHeading || name
  const description  = ad.description || 'Your ad description will appear here.'
  const ctaLabel     = ad.ctaText || 'Learn More'
  const destination  = ad.destinationUrl || 'yourwebsite.com'

  const bg          = isDark ? '#1A1A1B' : '#FFFFFF'
  const border      = isDark ? '#343438' : '#E8E8E8'
  const textMuted   = isDark ? '#71717A' : '#9CA3AF'
  const textPrimary = isDark ? '#F5F5F5' : '#1A1A1A'

  return createPortal(
    <AnimatePresence>
      <motion.div key="bd"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(6px)', zIndex: 99998 }}
        onClick={onClose}
      />

      <div key="center" style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '3vh 16px',
        pointerEvents: 'none',
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 24 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={e => e.stopPropagation()}
          style={{
            pointerEvents: 'auto',
            width: 'min(420px, 96vw)',
            maxHeight: '94vh',
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: 20,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: isDark
              ? '0 32px 90px rgba(0,0,0,0.65), 0 0 0 1px rgba(52,52,56,0.80)'
              : '0 32px 90px rgba(0,0,0,0.20)',
          }}
        >
          {/* Header */}
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: 'rgba(245,197,24,0.15)', border: '1px solid rgba(245,197,24,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Smartphone size={14} style={{ color: '#F5C518' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                Ad Preview
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {detail?.name ?? ''}
              </p>
            </div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? 'rgba(52,52,56,0.60)' : 'rgba(0,0,0,0.06)', color: textMuted, border: 'none', flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>

          {/* Tabs */}
          {!loading && detail && hasVideo && (
            <div style={{ display: 'flex', gap: 6, padding: '10px 18px 0' }}>
              {(['feed', 'reel'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 10, fontSize: 11, fontWeight: 700, textAlign: 'center', cursor: 'pointer',
                    border: `1.5px solid ${tab === t ? 'rgba(245,197,24,0.45)' : border}`,
                    background: tab === t ? 'rgba(245,197,24,0.10)' : 'transparent',
                    color: tab === t ? '#F5C518' : textMuted,
                  }}
                >
                  {t === 'feed' ? 'Feed' : 'Reel'}
                </button>
              ))}
            </div>
          )}

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {loading || !detail ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '40px 0' }}>
                <Loader2 size={22} className="animate-spin" style={{ color: '#F5C518' }} />
                <p style={{ fontSize: 12, color: textMuted, margin: 0 }}>Loading preview…</p>
              </div>
            ) : tab === 'reel' && hasVideo ? (
              <div className="relative rounded-2xl overflow-hidden mx-auto" style={{ width: 220, height: 390, background: '#000' }}>
                <ProtectedVideo src={videoSrc} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.05) 40%, transparent 60%)' }} />
                <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)' }} />
                    <span className="text-white text-[10px] font-semibold truncate">{name}</span>
                    <span className="text-white/60 text-[9px] flex-shrink-0">· Sponsored</span>
                  </div>
                  <p className="text-white text-[10px] leading-relaxed line-clamp-2">{heading}</p>
                  <button className="w-full py-1.5 rounded-lg text-[11px] font-bold text-[#1A1A1A]" style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)' }}>
                    {ctaLabel}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden mx-auto w-full" style={{ maxWidth: 320, border: `1px solid ${border}` }}>
                <div className="px-3 py-2 flex items-center gap-2" style={{ background: isDark ? '#2B2B2D' : '#fff', borderBottom: `1px solid ${border}` }}>
                  <div className="w-7 h-7 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)' }} />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold truncate" style={{ color: textPrimary }}>{name}</p>
                    <p className="text-[9px]" style={{ color: textMuted }}>Sponsored</p>
                  </div>
                </div>
                <div className="relative flex items-center justify-center" style={{ height: 200, background: isDark ? '#1E1E1F' : '#F5F5F5' }}>
                  {mediaImage ? (
                    <ProtectedImg src={mediaImage} alt={name} className="w-full h-full object-cover" />
                  ) : hasVideo ? (
                    <ProtectedVideo src={videoSrc} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      {isBanner ? <ImageIcon size={26} style={{ color: textPrimary }} /> : <Video size={26} style={{ color: textPrimary }} />}
                      <span className="text-[11px]" style={{ color: textPrimary }}>No creative uploaded</span>
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-2" style={{ background: isDark ? '#2B2B2D' : '#fff' }}>
                  <p className="text-xs font-semibold" style={{ color: textPrimary }}>{heading}</p>
                  <p className="text-xs" style={{ color: isDark ? '#A1A1AA' : '#666' }}>{description}</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] truncate" style={{ color: textMuted }}>{destination}</span>
                    <button className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-[#1A1A1A] flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)' }}>
                      {ctaLabel}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!loading && detail && !hasVideo && !mediaImage && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, fontSize: 11, color: textMuted }}>
                <Film size={12} /> This campaign has no banner or reel uploaded yet.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}
