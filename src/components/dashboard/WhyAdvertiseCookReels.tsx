'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import { ArrowRight, Sparkles, BarChart2 } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type CellValue = string | string[]

interface ComparisonRow {
  feature: string
  cookreels: CellValue
  meta: CellValue
  google: CellValue
  geofencing: CellValue
}

// ─── Static Data ─────────────────────────────────────────────────────────────

const AUDIENCE_STAT_CARDS = [
  {
    emoji: '🍽️',
    title: 'Food-Focused Audience',
    desc: 'Only food-related content',
    color: '#F5C518',
    gradient: 'linear-gradient(135deg, rgba(245,197,24,0.13), rgba(255,184,0,0.05))',
  },
  {
    emoji: '🎯',
    title: 'Highly Relevant Reach',
    desc: 'Reach users already interested in cooking',
    color: '#7DBB91',
    gradient: 'linear-gradient(135deg, rgba(125,187,145,0.13), rgba(125,187,145,0.05))',
  },
  {
    emoji: '📍',
    title: 'Perfect for Local Businesses',
    desc: 'Restaurants, cafés & bakeries',
    color: '#4285F4',
    gradient: 'linear-gradient(135deg, rgba(66,133,244,0.13), rgba(66,133,244,0.05))',
  },
  {
    emoji: '🚀',
    title: 'Higher Intent Audience',
    desc: 'Users actively discovering what to cook or eat',
    color: '#FF9F1C',
    gradient: 'linear-gradient(135deg, rgba(255,159,28,0.13), rgba(255,159,28,0.05))',
  },
]

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: 'Audience',
    cookreels:
      '100% Food Lovers, Home Cooks, Chefs, Restaurant Seekers & Kitchen Enthusiasts',
    meta: 'General Audience',
    google: 'General Audience',
    geofencing: 'Anyone inside a selected geographic area',
  },
  {
    feature: 'Best For',
    cookreels: [
      'Restaurants', 'Cafés', 'Cloud Kitchens', 'Bakeries',
      'Kitchen Products', 'Cookware', 'Food Brands', 'Cooking Classes', 'Recipe Creators',
    ],
    meta: ['Any Business'],
    google: ['Any Business'],
    geofencing: ['Physical Local Businesses'],
  },
  {
    feature: 'Industry Relevance',
    cookreels: 'Every impression reaches people interested in cooking or food.',
    meta: 'Food ads compete against every industry.',
    google: 'Broad search audience.',
    geofencing: 'Location only.',
  },
  {
    feature: 'Targeting',
    cookreels: ['Recipes', 'Cuisine', 'Ingredients', 'Cooking', 'Kitchen', 'Food Categories', 'Restaurants'],
    meta: ['Interest', 'Demographics'],
    google: ['Search', 'Keywords', 'Intent'],
    geofencing: ['Location Radius'],
  },
  {
    feature: 'Placement',
    cookreels: ['Recipe Feed', 'Cooking Reels', 'Chef Profiles', 'Explore Feed', 'Category Pages', 'Restaurant Listings'],
    meta: ['Facebook', 'Instagram', 'Stories', 'Reels'],
    google: ['Search', 'Display', 'YouTube', 'Apps'],
    geofencing: ['Mobile Apps', 'Partner Network'],
  },
  {
    feature: 'User Intent',
    cookreels: 'Already discovering food or recipes.',
    meta: 'Browsing social media.',
    google: 'Searching information.',
    geofencing: 'Simply nearby.',
  },
  {
    feature: 'Competition',
    cookreels: 'Food businesses only.',
    meta: 'Every industry.',
    google: 'Every industry.',
    geofencing: 'Nearby advertisers.',
  },
  {
    feature: 'Ad Formats',
    cookreels: [
      'Recipe Boosts', 'Reel Promotions', 'Restaurant Spotlight',
      'Kitchen Product Showcase', 'Featured Brand Banner',
    ],
    meta: ['Image', 'Video', 'Carousel', 'Stories'],
    google: ['Search', 'Display', 'Shopping', 'Video'],
    geofencing: ['Banner', 'Interstitial', 'Display'],
  },
  {
    feature: 'Brand Trust',
    cookreels: 'Trusted food community.',
    meta: 'General social platform.',
    google: 'General advertising platform.',
    geofencing: 'Location-based advertising.',
  },
  {
    feature: 'Restaurant Promotion',
    cookreels: '★★★★★',
    meta: '★★★★☆',
    google: '★★★★☆',
    geofencing: '★★★★★',
  },
  {
    feature: 'Kitchen Product Promotion',
    cookreels: '★★★★★',
    meta: '★★★★☆',
    google: '★★★★☆',
    geofencing: '★★★☆☆',
  },
  {
    feature: 'Budget Flexibility',
    cookreels: 'Perfect for startups and enterprise brands.',
    meta: 'Flexible',
    google: 'Flexible',
    geofencing: 'Usually higher budgets.',
  },
  {
    feature: 'Ideal Businesses',
    cookreels: [
      'Restaurants', 'Cloud Kitchens', 'Bakeries', 'Food Trucks', 'Cafés',
      'Kitchen Appliances', 'Cookware', 'Grocery Stores', 'Spice Brands',
      'Recipe Creators', 'Cooking Schools',
    ],
    meta: ['All Businesses'],
    google: ['All Businesses'],
    geofencing: ['Physical Stores'],
  },
]

const WHY_WINS_CARDS = [
  {
    emoji: '🎯',
    title: 'Food-Only Audience',
    desc: 'Unlike generic advertising platforms, every impression reaches users who love cooking, recipes, restaurants and food discovery.',
    badge: 'Most Targeted',
    color: '#F5C518',
    gradient: 'linear-gradient(135deg, rgba(245,197,24,0.14), rgba(255,184,0,0.04))',
  },
  {
    emoji: '📹',
    title: 'Native Food Advertising',
    desc: 'Your business appears naturally inside recipe feeds, cooking reels and food discovery instead of interrupting unrelated content.',
    badge: 'Best Placement',
    color: '#7DBB91',
    gradient: 'linear-gradient(135deg, rgba(125,187,145,0.14), rgba(125,187,145,0.04))',
  },
  {
    emoji: '🚀',
    title: 'Better Quality Leads',
    desc: 'People already interested in food are significantly more likely to engage with restaurants, groceries and kitchen products.',
    badge: 'Higher Conversions',
    color: '#FF9F1C',
    gradient: 'linear-gradient(135deg, rgba(255,159,28,0.14), rgba(255,159,28,0.04))',
  },
]

const BUSINESS_CARDS = [
  { emoji: '🍴', title: 'Restaurants',         desc: 'Reach diners actively seeking their next meal.' },
  { emoji: '☕', title: 'Cafés',               desc: 'Attract coffee lovers and food explorers.' },
  { emoji: '🥐', title: 'Bakeries',            desc: 'Showcase your pastries to baking enthusiasts.' },
  { emoji: '🚚', title: 'Cloud Kitchens',      desc: 'Drive orders from home cooks needing meal ideas.' },
  { emoji: '🍳', title: 'Kitchen Appliances',  desc: 'Reach home chefs upgrading their equipment.' },
  { emoji: '🔪', title: 'Cookware Brands',     desc: 'Showcase products to passionate cooks.' },
  { emoji: '🛒', title: 'Grocery Stores',      desc: 'Connect with shoppers building their pantries.' },
  { emoji: '🌶️', title: 'Spice Brands',        desc: 'Find recipe creators exploring new flavors.' },
  { emoji: '👩‍🍳', title: 'Cooking Schools',    desc: 'Enroll aspiring chefs and food lovers.' },
  { emoji: '📖', title: 'Recipe Creators',     desc: 'Grow your audience with food-first discovery.' },
]

const FLOATING_EMOJIS = ['🍕', '🍜', '🥗', '🍰', '🥘', '🍱', '🧁', '🍣']

// ─── Animation Wrapper ───────────────────────────────────────────────────────

function FadeUp({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// ─── Star Rating ─────────────────────────────────────────────────────────────

function StarRating({ value }: { value: string }) {
  const filled = (value.match(/★/g) ?? []).length
  const empty  = (value.match(/☆/g) ?? []).length
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${filled} out of ${filled + empty} stars`}
    >
      {Array.from({ length: filled + empty }, (_, i) => (
        <span
          key={i}
          style={{ color: i < filled ? '#F5C518' : '#52525B', fontSize: 13, lineHeight: 1 }}
        >
          {i < filled ? '★' : '☆'}
        </span>
      ))}
    </div>
  )
}

// ─── Table Cell Renderer ─────────────────────────────────────────────────────

function CellContent({
  value,
  isDark,
  isCookReels = false,
}: {
  value: CellValue
  isDark: boolean
  isCookReels?: boolean
}) {
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1" role="list">
        {value.map(tag => (
          <span
            key={tag}
            role="listitem"
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{
              background: isCookReels
                ? 'rgba(245,197,24,0.14)'
                : isDark ? 'rgba(52,52,56,0.80)' : 'rgba(0,0,0,0.06)',
              color: isCookReels ? '#F5C518' : isDark ? '#A1A1AA' : '#555',
              border: isCookReels
                ? '1px solid rgba(245,197,24,0.28)'
                : `1px solid ${isDark ? '#343438' : '#E5E5E5'}`,
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    )
  }
  if (typeof value === 'string' && (value.includes('★') || value.includes('☆'))) {
    return <StarRating value={value} />
  }
  return (
    <p
      className="text-xs leading-relaxed"
      style={{
        color: isCookReels
          ? isDark ? '#F0F0F0' : '#1A1A1A'
          : isDark ? '#A1A1AA' : '#666',
        fontWeight: isCookReels ? 500 : 400,
      }}
    >
      {value}
    </p>
  )
}

// ─── Main Export ─────────────────────────────────────────────────────────────

export default function WhyAdvertiseCookReels() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const cardStyle: React.CSSProperties = {
    background: isDark ? 'rgba(43,43,45,0.60)' : 'rgba(255,255,255,0.85)',
    border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
    backdropFilter: 'blur(20px)',
    boxShadow: isDark
      ? '0 4px 24px rgba(0,0,0,0.30)'
      : '0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)',
  }

  const textPrimary    = isDark ? '#F5F5F5' : '#1A1A1A'
  const textMuted      = isDark ? '#71717A'  : '#9CA3AF'
  const borderColor    = isDark ? '#343438'  : '#E8E8E8'
  const rowAltBg       = isDark ? 'rgba(28,28,29,0.50)' : 'rgba(248,248,248,0.70)'
  const stickyBgEven   = isDark ? 'rgba(43,43,45,0.97)' : 'rgba(255,255,255,0.98)'
  const stickyBgAlt    = isDark ? 'rgba(28,28,29,0.97)' : 'rgba(248,248,248,0.98)'
  const headerStickyBg = isDark ? 'rgba(26,26,27,0.98)' : 'rgba(245,245,245,0.98)'
  const crBorder       = 'rgba(245,197,24,0.45)'
  const crColBg        = isDark ? 'rgba(245,197,24,0.045)' : 'rgba(245,197,24,0.028)'

  return (
    <div className="space-y-5 mt-5">

      {/* ═══════════════════════════════════════════════════════════════════
          § 1  Header + Stat Cards
          ═══════════════════════════════════════════════════════════════════ */}
      <FadeUp>
        <div className="rounded-2xl p-6 sm:p-8 lg:p-10" style={cardStyle}>

          {/* Label pill */}
          <div className="flex justify-center mb-5">
            <span
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold"
              style={{
                background: 'rgba(245,197,24,0.14)',
                border: '1px solid rgba(245,197,24,0.32)',
                color: '#F5C518',
              }}
            >
              <Sparkles size={11} /> Advertise Smarter
            </span>
          </div>

          {/* Heading */}
          <h2
            className="text-2xl sm:text-3xl lg:text-[2.2rem] font-bold text-center leading-tight mb-4"
            style={{ color: textPrimary, fontFamily: 'var(--font-poppins), sans-serif' }}
          >
            Why Boost Your Business on{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #F5C518, #FFB800)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              CookReels?
            </span>
          </h2>

          {/* Subtitle */}
          <p
            className="text-sm sm:text-base text-center max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: textMuted }}
          >
            Reach people who are already passionate about food, cooking, restaurants, baking,
            groceries, and kitchen products — instead of advertising to a generic audience.
          </p>

          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {AUDIENCE_STAT_CARDS.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ scale: 1.03, y: -4 }}
                className="rounded-2xl p-5 cursor-default"
                style={{
                  background: card.gradient,
                  border: `1px solid ${card.color}22`,
                }}
              >
                <span className="block text-3xl mb-3 select-none">{card.emoji}</span>
                <h4
                  className="text-sm font-bold mb-1.5"
                  style={{ color: textPrimary, fontFamily: 'var(--font-poppins), sans-serif' }}
                >
                  {card.title}
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: textMuted }}>
                  {card.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </FadeUp>

      {/* ═══════════════════════════════════════════════════════════════════
          § 2  Feature Comparison Table
          ═══════════════════════════════════════════════════════════════════ */}
      <FadeUp delay={0.08}>
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>

          {/* Section header */}
          <div
            className="px-5 pt-5 pb-4 flex items-center gap-3"
            style={{ borderBottom: `1px solid ${borderColor}` }}
          >
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: 'rgba(245,197,24,0.14)',
                border: '1px solid rgba(245,197,24,0.28)',
              }}
            >
              <BarChart2 size={15} style={{ color: '#F5C518' }} />
            </div>
            <div>
              <h3
                className="text-sm font-bold leading-none"
                style={{ color: textPrimary, fontFamily: 'var(--font-poppins), sans-serif' }}
              >
                Platform Comparison
              </h3>
              <p className="text-[11px] mt-0.5" style={{ color: textMuted }}>
                See how CookReels compares to other advertising platforms
              </p>
            </div>
          </div>

          {/* Scrollable table region */}
          <div
            className="overflow-x-auto"
            style={{ WebkitOverflowScrolling: 'touch' }}
            role="region"
            aria-label="Platform comparison table — scroll horizontally to see all columns"
          >
            <div style={{ minWidth: 880 }}>

              {/* ── Column headers ── */}
              <div
                className="flex items-stretch"
                style={{
                  background: isDark ? 'rgba(28,28,29,0.55)' : 'rgba(246,246,246,0.80)',
                  borderBottom: `1px solid ${borderColor}`,
                }}
              >
                {/* "Feature" sticky label */}
                <div
                  className="flex-shrink-0 px-4 py-3 flex items-center"
                  style={{
                    width: 180,
                    position: 'sticky',
                    left: 0,
                    zIndex: 20,
                    background: headerStickyBg,
                    borderRight: `1px solid ${borderColor}`,
                  }}
                >
                  <span
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: textMuted }}
                  >
                    Feature
                  </span>
                </div>

                {/* CookReels header — highlighted column */}
                <div
                  className="flex-shrink-0 px-4 py-3 flex flex-col justify-center"
                  style={{
                    width: 230,
                    background: isDark ? 'rgba(245,197,24,0.07)' : 'rgba(245,197,24,0.045)',
                    borderLeft:  `2px solid ${crBorder}`,
                    borderRight: `2px solid ${crBorder}`,
                    borderTop:   `2px solid ${crBorder}`,
                    boxShadow: '0 0 28px rgba(245,197,24,0.08)',
                  }}
                  aria-label="CookReels — Recommended platform"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-sm font-bold"
                      style={{ color: '#F5C518', fontFamily: 'var(--font-poppins), sans-serif' }}
                    >
                      CookReels
                    </span>
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none"
                      style={{ background: '#F5C518', color: '#1A1A1A' }}
                    >
                      ✦ Best
                    </span>
                  </div>
                  <p className="text-[10px]" style={{ color: textMuted }}>Food-First Platform</p>
                </div>

                {/* Other platform headers */}
                {([
                  { label: 'Meta Ads',    sub: 'Social Media'     },
                  { label: 'Google Ads',  sub: 'Search & Display' },
                  { label: 'Geofencing',  sub: 'Location-Based'   },
                ] as const).map(col => (
                  <div
                    key={col.label}
                    className="flex-1 px-4 py-3 flex flex-col justify-center"
                    style={{ minWidth: 150, borderLeft: `1px solid ${borderColor}` }}
                  >
                    <span className="text-xs font-bold" style={{ color: textPrimary }}>{col.label}</span>
                    <span className="text-[10px] mt-0.5" style={{ color: textMuted }}>{col.sub}</span>
                  </div>
                ))}
              </div>

              {/* ── Data rows ── */}
              {COMPARISON_ROWS.map((row, rowIdx) => {
                const isAlt  = rowIdx % 2 === 1
                const isLast = rowIdx === COMPARISON_ROWS.length - 1
                return (
                  <div
                    key={row.feature}
                    className="flex items-stretch"
                    style={{
                      borderBottom: isLast ? 'none' : `1px solid ${borderColor}`,
                      background: isAlt ? rowAltBg : 'transparent',
                    }}
                  >
                    {/* Feature name — sticky */}
                    <div
                      className="flex-shrink-0 px-4 py-4 flex items-start"
                      style={{
                        width: 180,
                        position: 'sticky',
                        left: 0,
                        zIndex: 10,
                        background: isAlt ? stickyBgAlt : stickyBgEven,
                        borderRight: `1px solid ${borderColor}`,
                      }}
                    >
                      <span
                        className="text-xs font-semibold leading-snug"
                        style={{ color: textPrimary }}
                      >
                        {row.feature}
                      </span>
                    </div>

                    {/* CookReels value — highlighted */}
                    <div
                      className="flex-shrink-0 px-4 py-4"
                      style={{
                        width: 230,
                        background: crColBg,
                        borderLeft:   `2px solid ${crBorder}`,
                        borderRight:  `2px solid ${crBorder}`,
                        borderBottom: isLast ? `2px solid ${crBorder}` : undefined,
                      }}
                    >
                      <CellContent value={row.cookreels} isDark={isDark} isCookReels />
                    </div>

                    {/* Meta */}
                    <div
                      className="flex-1 px-4 py-4"
                      style={{ minWidth: 150, borderLeft: `1px solid ${borderColor}` }}
                    >
                      <CellContent value={row.meta} isDark={isDark} />
                    </div>

                    {/* Google */}
                    <div
                      className="flex-1 px-4 py-4"
                      style={{ minWidth: 150, borderLeft: `1px solid ${borderColor}` }}
                    >
                      <CellContent value={row.google} isDark={isDark} />
                    </div>

                    {/* Geofencing */}
                    <div
                      className="flex-1 px-4 py-4"
                      style={{ minWidth: 150, borderLeft: `1px solid ${borderColor}` }}
                    >
                      <CellContent value={row.geofencing} isDark={isDark} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </FadeUp>

      {/* ═══════════════════════════════════════════════════════════════════
          § 3  Why CookReels Wins
          ═══════════════════════════════════════════════════════════════════ */}
      <FadeUp delay={0.08}>
        <div className="rounded-2xl p-6 sm:p-8" style={cardStyle}>

          <div className="text-center mb-8">
            <span
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold mb-4"
              style={{
                background: 'rgba(245,197,24,0.14)',
                border: '1px solid rgba(245,197,24,0.32)',
                color: '#F5C518',
              }}
            >
              <Sparkles size={11} /> The CookReels Advantage
            </span>
            <h3
              className="text-xl sm:text-2xl font-bold"
              style={{ color: textPrimary, fontFamily: 'var(--font-poppins), sans-serif' }}
            >
              Why CookReels Wins
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {WHY_WINS_CARDS.map((card, i) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ scale: 1.02, y: -5 }}
                className="rounded-2xl p-5 relative overflow-hidden cursor-default"
                style={{
                  background: card.gradient,
                  border: `1px solid ${card.color}22`,
                }}
              >
                {/* Callout badge */}
                <span
                  className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    background: `${card.color}18`,
                    color: card.color,
                    border: `1px solid ${card.color}30`,
                  }}
                >
                  {card.badge}
                </span>

                <span className="block text-3xl mb-3 select-none">{card.emoji}</span>
                <h4
                  className="text-sm font-bold mb-2 pr-24"
                  style={{ color: textPrimary, fontFamily: 'var(--font-poppins), sans-serif' }}
                >
                  {card.title}
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: textMuted }}>
                  {card.desc}
                </p>

                {/* Corner glow */}
                <div
                  className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full pointer-events-none"
                  style={{ background: `${card.color}10`, filter: 'blur(20px)' }}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </FadeUp>

      {/* ═══════════════════════════════════════════════════════════════════
          § 4  Perfect Businesses Grid
          ═══════════════════════════════════════════════════════════════════ */}
      <FadeUp delay={0.08}>
        <div className="rounded-2xl p-6 sm:p-8" style={cardStyle}>

          <div className="text-center mb-8">
            <h3
              className="text-xl sm:text-2xl font-bold mb-2"
              style={{ color: textPrimary, fontFamily: 'var(--font-poppins), sans-serif' }}
            >
              Perfect for These Businesses
            </h3>
            <p className="text-sm" style={{ color: textMuted }}>
              Whether you're a local restaurant or a global food brand, CookReels has your audience.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {BUSINESS_CARDS.map((biz, i) => (
              <motion.div
                key={biz.title}
                initial={{ opacity: 0, scale: 0.94 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.4, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.97 }}
                className="rounded-2xl p-4 flex flex-col items-center text-center gap-2 cursor-default"
                style={{
                  background: isDark ? 'rgba(30,30,31,0.60)' : 'rgba(248,248,248,0.80)',
                  border: `1px solid ${borderColor}`,
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = 'rgba(245,197,24,0.40)'
                  el.style.boxShadow   = '0 4px 20px rgba(245,197,24,0.14)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = borderColor
                  el.style.boxShadow   = 'none'
                }}
              >
                <motion.span
                  className="text-2xl select-none"
                  whileHover={{ y: -4, scale: 1.2 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 16 }}
                >
                  {biz.emoji}
                </motion.span>
                <p className="text-xs font-bold leading-tight" style={{ color: textPrimary }}>
                  {biz.title}
                </p>
                <p
                  className="text-[10px] leading-relaxed hidden sm:block"
                  style={{ color: textMuted }}
                >
                  {biz.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </FadeUp>

      {/* ═══════════════════════════════════════════════════════════════════
          § 5  CTA Banner
          ═══════════════════════════════════════════════════════════════════ */}
      <FadeUp delay={0.08}>
        <div
          className="rounded-2xl p-8 sm:p-12 relative overflow-hidden"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(245,197,24,0.12) 0%, rgba(255,159,28,0.07) 50%, rgba(43,43,45,0.60) 100%)'
              : 'linear-gradient(135deg, rgba(245,197,24,0.14) 0%, rgba(255,184,0,0.07) 60%, rgba(255,255,255,0.85) 100%)',
            border: '1px solid rgba(245,197,24,0.28)',
            boxShadow: isDark
              ? '0 8px 40px rgba(245,197,24,0.10)'
              : '0 8px 40px rgba(245,197,24,0.08)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Floating food icons */}
          {FLOATING_EMOJIS.map((emoji, i) => (
            <motion.span
              key={i}
              className="absolute select-none pointer-events-none"
              style={{
                top:      `${8  + (i * 12) % 72}%`,
                left:     `${3  + (i * 11) % 94}%`,
                fontSize: '2.4rem',
                opacity:  isDark ? 0.07 : 0.09,
              }}
              animate={{
                y:      [0, -10, 0],
                rotate: [0, i % 2 === 0 ? 7 : -7, 0],
              }}
              transition={{
                duration: 3.5 + i * 0.5,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.35,
              }}
            >
              {emoji}
            </motion.span>
          ))}

          {/* Content */}
          <div className="relative z-10 text-center max-w-2xl mx-auto">
            <motion.span
              className="block text-5xl mb-5 select-none"
              animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              🚀
            </motion.span>

            <h2
              className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 leading-tight"
              style={{ color: textPrimary, fontFamily: 'var(--font-poppins), sans-serif' }}
            >
              Ready to Reach Thousands of{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #F5C518, #FFB800)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Food Lovers?
              </span>
            </h2>

            <p
              className="text-sm sm:text-base mb-8 leading-relaxed max-w-lg mx-auto"
              style={{ color: textMuted }}
            >
              Launch a CookReels Boost campaign today and promote your restaurant, recipe, food brand
              or kitchen products directly to people who are already passionate about cooking.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/boost/create">
                <motion.span
                  role="button"
                  aria-label="Create Campaign"
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl text-sm font-bold cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #F5C518, #FFB800)',
                    color: '#1A1A1A',
                    boxShadow: '0 6px 24px rgba(245,197,24,0.40)',
                    fontFamily: 'var(--font-poppins), sans-serif',
                  }}
                >
                  Create Campaign <ArrowRight size={15} />
                </motion.span>
              </Link>

              <Link href="/boost">
                <motion.span
                  role="button"
                  aria-label="Learn More about CookReels Boost"
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold cursor-pointer"
                  style={{
                    background: isDark ? 'rgba(43,43,45,0.70)' : 'rgba(255,255,255,0.85)',
                    border: `1px solid ${borderColor}`,
                    color: textPrimary,
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  Learn More
                </motion.span>
              </Link>
            </div>
          </div>
        </div>
      </FadeUp>

    </div>
  )
}
