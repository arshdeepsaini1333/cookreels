'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '@/context/ThemeContext'
import {
  ArrowRight, Sparkles, MapPin, Smartphone, Tv, Film, Target,
  Globe, ChevronDown, Users, Rocket, BarChart2, ShoppingBag,
  Play, Building, Monitor, Share2, Megaphone, Zap,
  Plus, DollarSign, TrendingUp, FileText, Check, X,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type CellValue = string | string[]

interface ComparisonRow {
  feature: string
  cookreels: CellValue
  meta: CellValue
  google: CellValue
  geofencing: CellValue
}

interface FaqItem {
  question: string
  answer: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const HERO_EMOJIS = ['🍕', '🍜', '🥗', '🍰', '🥘', '🍱', '🧁', '🍣', '🍔', '🌮']

const WHY_CARDS = [
  { emoji: '🍽️', title: 'Food-Focused Audience',     desc: 'Only food-related content — zero competitor noise',       color: '#F5C518', bg: 'linear-gradient(135deg, rgba(245,197,24,0.13), rgba(255,184,0,0.05))' },
  { emoji: '🎯', title: 'Highly Relevant Reach',      desc: 'Reach users actively interested in cooking & food',       color: '#7DBB91', bg: 'linear-gradient(135deg, rgba(125,187,145,0.13), rgba(125,187,145,0.05))' },
  { emoji: '📍', title: 'Precision Location Targeting', desc: 'Reach customers near your location or competitors',     color: '#4285F4', bg: 'linear-gradient(135deg, rgba(66,133,244,0.13), rgba(66,133,244,0.05))' },
  { emoji: '🚀', title: 'Omnichannel Campaigns',      desc: 'Mobile, OTT/CTV, video, display and social in one place', color: '#FF9F1C', bg: 'linear-gradient(135deg, rgba(255,159,28,0.13), rgba(255,159,28,0.05))' },
]

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    feature: 'Audience',
    cookreels:  '100% Food Lovers, Home Cooks, Chefs, Restaurant Seekers & Kitchen Enthusiasts',
    meta:       'General Audience',
    google:     'General Audience',
    geofencing: 'Anyone near a targeted physical location',
  },
  {
    feature: 'Best For',
    cookreels:  ['Restaurants', 'Cafés', 'Cloud Kitchens', 'Bakeries', 'Kitchen Products', 'Food Brands', 'Recipe Creators'],
    meta:       ['Any Business'],
    google:     ['Any Business'],
    geofencing: ['Physical Businesses', 'Events', 'Competitor Targeting', 'Local Promotions'],
  },
  {
    feature: 'Targeting',
    cookreels:  ['Recipes', 'Cuisine', 'Ingredients', 'Cooking', 'Kitchen', 'Food Categories'],
    meta:       ['Interest', 'Demographics'],
    google:     ['Search', 'Keywords', 'Intent'],
    geofencing: ['Location Radius', 'Competitor Zones', 'Events', 'Custom Boundaries'],
  },
  {
    feature: 'Placement',
    cookreels:  ['Recipe Feed', 'Cooking Reels', 'Chef Profiles', 'Explore Feed', 'Category Pages'],
    meta:       ['Facebook', 'Instagram', 'Stories', 'Reels'],
    google:     ['Search', 'Display', 'YouTube', 'Apps'],
    geofencing: ['Mobile Apps', 'OTT/CTV', 'Display', 'Video', 'Social'],
  },
  {
    feature: 'Ad Formats',
    cookreels:  ['Recipe Boosts', 'Reel Promotions', 'Restaurant Spotlight', 'Kitchen Product Showcase', 'Featured Brand Banner'],
    meta:       ['Image', 'Video', 'Carousel', 'Stories'],
    google:     ['Search', 'Display', 'Shopping', 'Video'],
    geofencing: ['Mobile', 'OTT/CTV', 'Video', 'Display', 'Social'],
  },
  {
    feature: 'User Intent',
    cookreels:  'Already discovering food or recipes.',
    meta:       'Browsing social media.',
    google:     'Searching for information.',
    geofencing: 'Near targeted locations or competitor stores.',
  },
  {
    feature: 'Restaurant Promotion',
    cookreels:  '★★★★★',
    meta:       '★★★★☆',
    google:     '★★★★☆',
    geofencing: '★★★★★',
  },
  {
    feature: 'Kitchen Products',
    cookreels:  '★★★★★',
    meta:       '★★★★☆',
    google:     '★★★★☆',
    geofencing: '★★★★★',
  },
  {
    feature: 'Local Promotions',
    cookreels:  '★★★★★',
    meta:       '★★★★☆',
    google:     '★★★★☆',
    geofencing: '★★★★★',
  },
  {
    feature: 'Brand Awareness',
    cookreels:  '★★★★★',
    meta:       '★★★★★',
    google:     '★★★★★',
    geofencing: '★★★★★',
  },
  {
    feature: 'Budget Flexibility',
    cookreels:  'Perfect for startups and enterprise brands.',
    meta:       'Flexible',
    google:     'Flexible',
    geofencing: 'Scales with campaign goals.',
  },
]

const BOOST_FEATURES = [
  { icon: Users,       title: 'Reach Food Lovers',         desc: 'Engage a highly targeted audience of food enthusiasts, home cooks, chefs and restaurant seekers.',             color: '#F5C518', bg: 'linear-gradient(135deg, rgba(245,197,24,0.12), rgba(255,184,0,0.04))' },
  { icon: Megaphone,   title: 'Native Recipe Advertising',  desc: 'Embed your brand naturally inside recipe content, cooking reels and food discovery feeds.',                    color: '#7DBB91', bg: 'linear-gradient(135deg, rgba(125,187,145,0.12), rgba(125,187,145,0.04))' },
  { icon: MapPin,      title: 'Restaurant Promotions',      desc: 'Drive foot traffic and online orders by showcasing your restaurant to nearby food lovers.',                     color: '#4285F4', bg: 'linear-gradient(135deg, rgba(66,133,244,0.12), rgba(66,133,244,0.04))' },
  { icon: ShoppingBag, title: 'Kitchen Product Campaigns',  desc: 'Showcase cookware, appliances and kitchen tools to people actively cooking at home.',                         color: '#FF9F1C', bg: 'linear-gradient(135deg, rgba(255,159,28,0.12), rgba(255,159,28,0.04))' },
  { icon: Film,        title: 'Recipe Sponsorships',        desc: 'Sponsor popular recipe videos and food reels to reach highly engaged cooking audiences.',                      color: '#A855F7', bg: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(168,85,247,0.04))' },
  { icon: Target,      title: 'Creator Collaborations',     desc: 'Partner with food creators and culinary influencers to amplify your brand message authentically.',            color: '#EC4899', bg: 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(236,72,153,0.04))' },
]

const GEO_FEATURES = [
  { icon: MapPin,      title: 'Custom Boundaries',      desc: 'Create precise geographic boundaries around stores, competitor locations, event venues, shopping malls and business districts.', badge: 'Precision Geofencing', color: '#F5C518', bg: 'linear-gradient(135deg, rgba(245,197,24,0.12), rgba(255,184,0,0.04))' },
  { icon: Smartphone,  title: 'Mobile Native Ads',      desc: 'Reach customers through native in-app and mobile web advertising with significantly higher engagement than traditional display ads.', badge: '6× Higher Response', color: '#7DBB91', bg: 'linear-gradient(135deg, rgba(125,187,145,0.12), rgba(125,187,145,0.04))' },
  { icon: Tv,          title: 'OTT & Connected TV',     desc: 'Deliver video advertisements across Smart TVs, streaming platforms and mobile devices simultaneously using advanced audience targeting.', badge: 'Big + Small Screens', color: '#4285F4', bg: 'linear-gradient(135deg, rgba(66,133,244,0.12), rgba(66,133,244,0.04))' },
  { icon: Film,        title: 'Video Advertising',      desc: 'Run pre-roll, mid-roll and in-banner videos across thousands of publishers and premium inventory.', badge: 'Multi Format', color: '#FF9F1C', bg: 'linear-gradient(135deg, rgba(255,159,28,0.12), rgba(255,159,28,0.04))' },
  { icon: Share2,      title: 'Facebook & Instagram',   desc: 'Extend campaigns to Facebook and Instagram audiences through managed social media campaigns.', badge: 'Social Campaigns', color: '#A855F7', bg: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(168,85,247,0.04))' },
  { icon: Target,      title: 'Advanced Retargeting',   desc: 'Combine geofencing, CRM targeting, keyword targeting, site retargeting, search retargeting and IP targeting into one powerful campaign.', badge: '9 Targeting Methods', color: '#EC4899', bg: 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(236,72,153,0.04))' },
]

const CHANNELS = [
  { emoji: '📱', title: 'Mobile Ads',    desc: 'Native mobile placements',        color: '#F5C518', icon: Smartphone },
  { emoji: '💻', title: 'Display Ads',  desc: 'Premium websites & networks',      color: '#7DBB91', icon: Monitor },
  { emoji: '📺', title: 'OTT / CTV',    desc: 'Smart TVs & streaming devices',    color: '#4285F4', icon: Tv },
  { emoji: '🎥', title: 'Video Ads',    desc: 'Pre-roll, mid-roll, in-banner',    color: '#FF9F1C', icon: Film },
  { emoji: '🌐', title: 'Desktop',      desc: 'Browser inventory & display',      color: '#A855F7', icon: Globe },
  { emoji: '📲', title: 'Social',       desc: 'Facebook & Instagram',             color: '#EC4899', icon: Share2 },
]

const TIMELINE_STEPS = [
  { icon: MapPin,    step: '01', title: 'Select Locations', desc: 'Choose competitor stores, malls, offices, restaurants, events or any custom location.',                color: '#F5C518' },
  { icon: Users,     step: '02', title: 'Create Audience',  desc: 'Build audiences using real-world location data, behavioral signals and conversion zones.',              color: '#7DBB91' },
  { icon: Rocket,    step: '03', title: 'Launch Campaign',  desc: 'Run ads simultaneously across mobile, OTT/CTV, video, display and social formats.',                     color: '#4285F4' },
  { icon: BarChart2, step: '04', title: 'Track Results',    desc: 'Measure impressions, visits, engagement and conversions in real-time dashboards.',                      color: '#FF9F1C' },
]

const BUSINESSES = [
  { emoji: '🍴',  title: 'Restaurants' },
  { emoji: '☕',  title: 'Cafés' },
  { emoji: '🚚',  title: 'Cloud Kitchens' },
  { emoji: '🚐',  title: 'Food Trucks' },
  { emoji: '🥐',  title: 'Bakeries' },
  { emoji: '🍳',  title: 'Kitchen Appliances' },
  { emoji: '🔪',  title: 'Cookware' },
  { emoji: '🛒',  title: 'Grocery Stores' },
  { emoji: '🏪',  title: 'Supermarkets' },
  { emoji: '🌶️', title: 'Spice Brands' },
  { emoji: '🛵',  title: 'Food Delivery' },
  { emoji: '📖',  title: 'Recipe Creators' },
  { emoji: '👩‍🍳', title: 'Cooking Schools' },
  { emoji: '🌿',  title: 'Organic Food Brands' },
]

const FAQ_ITEMS: FaqItem[] = [
  {
    question: 'What is Geofencing Advertising?',
    answer: 'Geofencing advertising lets you draw virtual boundaries around real-world locations — competitor restaurants, shopping malls, events or business districts. When customers enter these zones, your ads are served to them across mobile apps, OTT/CTV, video, display and social platforms.',
  },
  {
    question: 'How accurate is location targeting?',
    answer: 'Our geofencing technology uses GPS, Wi-Fi and cell data to create precision boundaries as small as a few meters — enabling hyper-local targeting around individual storefronts, event venues or competitor locations with very high accuracy.',
  },
  {
    question: 'Can I advertise around competitor locations?',
    answer: 'Yes. Competitor geofencing is one of the most powerful use cases: draw boundaries around competitor restaurants or stores, capture their customers as they visit, and serve your targeted ads to those high-intent prospects across all channels.',
  },
  {
    question: 'Can I combine CookReels Boost and Geofencing?',
    answer: 'Absolutely — we strongly recommend it. CookReels Boost targets food lovers inside the CookReels ecosystem actively browsing recipes and food content. Geofencing extends your reach to real-world locations and competitor stores. Together they create a complete omnichannel food marketing strategy covering both digital content discovery and physical location-based targeting.',
  },
  {
    question: 'Which businesses benefit most from these advertising products?',
    answer: 'Both products work best for food and hospitality businesses: restaurants, cafés, cloud kitchens, food trucks, bakeries, grocery stores, kitchen appliance brands and food delivery services. CookReels Boost is ideal for content-driven discovery, while Geofencing excels at capturing location-intent audiences and competitor conquest campaigns.',
  },
]

// ─── Helper Components ────────────────────────────────────────────────────────

function FadeUp({
  children, delay = 0, className = '',
}: {
  children: React.ReactNode; delay?: number; className?: string
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

function SectionLabel({ icon: Icon, children }: { icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold"
      style={{ background: 'rgba(245,197,24,0.14)', border: '1px solid rgba(245,197,24,0.32)', color: '#F5C518' }}
    >
      {Icon && <Icon size={11} />}{children}
    </span>
  )
}

function StarRating({ value }: { value: string }) {
  const filled = (value.match(/★/g) ?? []).length
  const empty  = (value.match(/☆/g) ?? []).length
  return (
    <div className="flex items-center gap-0.5" aria-label={`${filled} of ${filled + empty} stars`}>
      {Array.from({ length: filled + empty }, (_, i) => (
        <span key={i} style={{ color: i < filled ? '#F5C518' : '#52525B', fontSize: 13, lineHeight: 1 }}>
          {i < filled ? '★' : '☆'}
        </span>
      ))}
    </div>
  )
}

function TableCell({
  value, isDark, variant = 'default',
}: {
  value: CellValue; isDark: boolean; variant?: 'default' | 'cr' | 'geo'
}) {
  const accentColor = variant === 'cr' ? '#F5C518' : variant === 'geo' ? '#7DBB91' : undefined

  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map(tag => (
          <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{
              background: accentColor ? `${accentColor}14` : isDark ? 'rgba(52,52,56,0.80)' : 'rgba(0,0,0,0.06)',
              color: accentColor ?? (isDark ? '#A1A1AA' : '#555'),
              border: `1px solid ${accentColor ? `${accentColor}28` : isDark ? '#343438' : '#E5E5E5'}`,
            }}
          >{tag}</span>
        ))}
      </div>
    )
  }
  if (typeof value === 'string' && (value.includes('★') || value.includes('☆'))) {
    return <StarRating value={value} />
  }
  return (
    <p className="text-xs leading-relaxed"
      style={{
        color: accentColor ? (isDark ? '#F0F0F0' : '#1A1A1A') : isDark ? '#A1A1AA' : '#666',
        fontWeight: accentColor ? 500 : 400,
      }}
    >
      {value}
    </p>
  )
}

function FaqAccordionItem({
  item, isOpen, onToggle, isDark, textPrimary, textMuted, borderColor,
}: {
  item: FaqItem; isOpen: boolean; onToggle: () => void
  isDark: boolean; textPrimary: string; textMuted: string; borderColor: string
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        border: `1px solid ${isOpen ? 'rgba(245,197,24,0.35)' : borderColor}`,
        background: isDark ? 'rgba(43,43,45,0.50)' : 'rgba(255,255,255,0.80)',
      }}
    >
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left gap-3"
      >
        <span className="text-sm font-semibold" style={{ color: textPrimary }}>{item.question}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.22 }} className="flex-shrink-0">
          <ChevronDown size={16} style={{ color: isOpen ? '#F5C518' : textMuted }} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="px-4 sm:px-5 pb-5">
              <p className="text-xs sm:text-sm leading-relaxed" style={{ color: textMuted }}>{item.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function BoostLandingPage() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [videoPlaying, setVideoPlaying] = useState(false)
  const [openMobileRow, setOpenMobileRow] = useState<number | null>(null)

  const cardStyle: React.CSSProperties = {
    background: isDark ? 'rgba(43,43,45,0.60)' : 'rgba(255,255,255,0.85)',
    border: `1px solid ${isDark ? '#343438' : '#E8E8E8'}`,
    backdropFilter: 'blur(20px)',
    boxShadow: isDark
      ? '0 4px 24px rgba(0,0,0,0.30)'
      : '0 2px 8px rgba(0,0,0,0.05), 0 8px 24px rgba(0,0,0,0.06)',
  }

  const textPrimary  = isDark ? '#F5F5F5' : '#1A1A1A'
  const textMuted    = isDark ? '#71717A'  : '#9CA3AF'
  const borderColor  = isDark ? '#343438'  : '#E8E8E8'
  const rowAltBg     = isDark ? 'rgba(28,28,29,0.55)' : 'rgba(248,248,248,0.70)'
  const stickyEven   = isDark ? 'rgba(43,43,45,0.98)'  : 'rgba(255,255,255,0.99)'
  const stickyAlt    = isDark ? 'rgba(28,28,29,0.98)'  : 'rgba(248,248,248,0.99)'
  const headerSticky = isDark ? 'rgba(26,26,27,0.99)'  : 'rgba(245,245,245,0.99)'

  const crBorder   = 'rgba(245,197,24,0.45)'
  const geoBorder  = 'rgba(125,187,145,0.45)'
  const crColBg    = isDark ? 'rgba(245,197,24,0.045)' : 'rgba(245,197,24,0.028)'
  const geoColBg   = isDark ? 'rgba(125,187,145,0.045)' : 'rgba(125,187,145,0.025)'

  const poppins = 'var(--font-poppins), sans-serif'

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="space-y-5">

      {/* ═══════════════════════════════════════════════════════════════════
          HERO — compact header + dashboard quick links
          ═══════════════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        className="relative rounded-2xl overflow-hidden px-5 sm:px-7 py-7 sm:py-8"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(30,30,31,0.95) 0%, rgba(26,26,27,0.98) 100%)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(247,241,217,0.90) 100%)',
          border: `1px solid ${borderColor}`,
          backdropFilter: 'blur(20px)',
          boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.35)' : '0 4px 20px rgba(0,0,0,0.05)',
        }}
      >
        {/* Subtle background glow */}
        <div className="absolute top-0 left-0 w-72 h-40 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(245,197,24,0.12), transparent)', filter: 'blur(50px)' }} />
        <div className="absolute bottom-0 right-0 w-64 h-40 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(125,187,145,0.10), transparent)', filter: 'blur(50px)' }} />

        {/* Subtle floating emojis — fewer, more transparent */}
        {['🍕', '🥗', '🍜', '🧁', '🍣'].map((emoji, i) => (
          <motion.span key={i} className="absolute select-none pointer-events-none"
            style={{ top: `${15 + i * 16}%`, left: `${8 + i * 18}%`, fontSize: '1.5rem', opacity: isDark ? 0.05 : 0.07 }}
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4 + i * 0.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.4 }}
          >{emoji}</motion.span>
        ))}

        <div className="relative z-10">

          {/* ── Top row: heading left, button right ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                  style={{ background: 'rgba(245,197,24,0.13)', border: '1px solid rgba(245,197,24,0.30)', color: '#F5C518' }}>
                  <Sparkles size={10} /> CookReels Advertising
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                  style={{ background: 'rgba(125,187,145,0.13)', border: '1px solid rgba(125,187,145,0.30)', color: '#7DBB91' }}>
                  + Geofencing
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-snug"
                style={{ color: textPrimary, fontFamily: poppins }}>
                Grow Your Food Business with{' '}
                <span style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Smarter Advertising
                </span>
              </h1>
              <p className="text-sm mt-1.5 max-w-lg" style={{ color: textMuted }}>
                CookReels Boost + Precision Geofencing — reach food lovers inside the app and real-world locations.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-shrink-0">
              <Link href="/boost/create">
                <motion.span whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap"
                  style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', color: '#1A1A1A', boxShadow: '0 4px 18px rgba(245,197,24,0.38)', fontFamily: poppins }}>
                  <Plus size={14} /> New Campaign
                </motion.span>
              </Link>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={() => scrollTo('why')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer whitespace-nowrap"
                style={{ background: isDark ? 'rgba(52,52,56,0.70)' : 'rgba(0,0,0,0.05)', border: `1px solid ${borderColor}`, color: textPrimary }}>
                Explore <ArrowRight size={13} />
              </motion.button>
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="mb-4" style={{ borderBottom: `1px solid ${borderColor}` }} />

          {/* ── Quick access dashboard links ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {([
              { icon: FileText,   label: 'My Campaigns', sub: 'View all campaigns',    href: '/boost/campaigns',  color: '#F5C518' },
              { icon: TrendingUp, label: 'Analytics',    sub: 'Track performance',     href: '/boost/analytics',  color: '#4285F4' },
              { icon: Users,      label: 'Leads',        sub: 'Manage your leads',     href: '/boost/leads',      color: '#7DBB91' },
              { icon: DollarSign, label: 'Billing',      sub: 'Payments & invoices',   href: '/boost/billing',    color: '#FF9F1C' },
              { icon: Megaphone,  label: 'Boost Create', sub: 'Launch a new ad',       href: '/boost/create',     color: '#A855F7' },
            ] as const).map(link => {
              const Icon = link.icon
              return (
                <Link key={link.label} href={link.href}>
                  <motion.div
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className="flex items-center gap-3 px-3.5 py-3 rounded-xl cursor-pointer transition-colors"
                    style={{
                      background: isDark ? 'rgba(30,30,31,0.70)' : 'rgba(0,0,0,0.03)',
                      border: `1px solid ${borderColor}`,
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLDivElement
                      el.style.borderColor = `${link.color}40`
                      el.style.background  = isDark ? `${link.color}10` : `${link.color}08`
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLDivElement
                      el.style.borderColor = borderColor
                      el.style.background  = isDark ? 'rgba(30,30,31,0.70)' : 'rgba(0,0,0,0.03)'
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${link.color}15`, border: `1px solid ${link.color}28` }}>
                      <Icon size={14} style={{ color: link.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold leading-none truncate" style={{ color: textPrimary }}>{link.label}</p>
                      <p className="text-[10px] mt-0.5 truncate" style={{ color: textMuted }}>{link.sub}</p>
                    </div>
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          WHY ADVERTISE WITH COOKREELS
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="why">
        <FadeUp>
          <div className="rounded-2xl p-6 sm:p-8 lg:p-10" style={cardStyle}>
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <SectionLabel icon={Zap}>Why Advertise With CookReels</SectionLabel>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: textPrimary, fontFamily: poppins }}>
                Two Powerful Products,{' '}
                <span style={{ background: 'linear-gradient(135deg,#F5C518,#FFB800)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  One Platform
                </span>
              </h2>
              <p className="text-sm sm:text-base max-w-2xl mx-auto leading-relaxed" style={{ color: textMuted }}>
                Reach food lovers inside the CookReels ecosystem with Boost, and extend your reach to
                real-world locations with precision Geofencing — all from a single dashboard.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {WHY_CARDS.map((card, i) => (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.5, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ scale: 1.03, y: -4 }}
                  className="rounded-2xl p-5 cursor-default"
                  style={{ background: card.bg, border: `1px solid ${card.color}22` }}
                >
                  <span className="block text-3xl mb-3 select-none">{card.emoji}</span>
                  <h4 className="text-sm font-bold mb-1.5" style={{ color: textPrimary, fontFamily: poppins }}>{card.title}</h4>
                  <p className="text-xs leading-relaxed" style={{ color: textMuted }}>{card.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          COMPARISON TABLE
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="comparison">
        <FadeUp delay={0.05}>
          <div className="rounded-2xl overflow-hidden" style={cardStyle}>
            {/* Header */}
            <div className="px-5 pt-5 pb-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${borderColor}` }}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(245,197,24,0.14)', border: '1px solid rgba(245,197,24,0.28)' }}>
                <BarChart2 size={15} style={{ color: '#F5C518' }} />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-none" style={{ color: textPrimary, fontFamily: poppins }}>
                  Platform Comparison
                </h3>
                <p className="text-[11px] mt-0.5" style={{ color: textMuted }}>
                  CookReels Boost and Geofencing vs other advertising platforms
                </p>
              </div>
            </div>

            {/* ── Mobile accordion (hidden on md+) ──────────────────────── */}
            <div className="md:hidden">
              {COMPARISON_ROWS.map((row, idx) => {
                const isOpen = openMobileRow === idx
                return (
                  <div key={row.feature} style={{ borderBottom: `1px solid ${borderColor}` }}>

                    {/* Row header / tap target */}
                    <button
                      onClick={() => setOpenMobileRow(isOpen ? null : idx)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center justify-between px-5 py-4 text-left"
                    >
                      <span className="text-sm font-semibold" style={{ color: textPrimary }}>
                        {row.feature}
                      </span>
                      <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.22 }}>
                        <ChevronDown size={15} style={{ color: isOpen ? '#F5C518' : textMuted }} />
                      </motion.div>
                    </button>

                    {/* Expanded content */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div className="px-4 pb-5 space-y-2.5">

                            {/* CookReels row — highlighted gold */}
                            <div className="rounded-xl p-3.5"
                              style={{ background: crColBg, border: `1.5px solid ${crBorder}` }}>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ background: '#F5C518' }}>
                                  <Check size={11} style={{ color: '#1A1A1A', strokeWidth: 3 }} />
                                </div>
                                <span className="text-xs font-bold" style={{ color: '#F5C518', fontFamily: poppins }}>
                                  CookReels Boost
                                </span>
                              </div>
                              <TableCell value={row.cookreels} isDark={isDark} variant="cr" />
                            </div>

                            {/* Meta row */}
                            <div className="rounded-xl p-3.5"
                              style={{ background: isDark ? 'rgba(30,30,31,0.55)' : 'rgba(248,248,248,0.70)', border: `1px solid ${borderColor}` }}>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ background: isDark ? '#343438' : '#E5E5E5' }}>
                                  <X size={10} style={{ color: isDark ? '#71717A' : '#9CA3AF', strokeWidth: 3 }} />
                                </div>
                                <span className="text-xs font-semibold" style={{ color: textPrimary }}>Meta Ads</span>
                              </div>
                              <TableCell value={row.meta} isDark={isDark} />
                            </div>

                            {/* Google row */}
                            <div className="rounded-xl p-3.5"
                              style={{ background: isDark ? 'rgba(30,30,31,0.55)' : 'rgba(248,248,248,0.70)', border: `1px solid ${borderColor}` }}>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ background: isDark ? '#343438' : '#E5E5E5' }}>
                                  <X size={10} style={{ color: isDark ? '#71717A' : '#9CA3AF', strokeWidth: 3 }} />
                                </div>
                                <span className="text-xs font-semibold" style={{ color: textPrimary }}>Google Ads</span>
                              </div>
                              <TableCell value={row.google} isDark={isDark} />
                            </div>

                            {/* Geofencing row — highlighted green */}
                            <div className="rounded-xl p-3.5"
                              style={{ background: geoColBg, border: `1.5px solid ${geoBorder}` }}>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ background: '#7DBB91' }}>
                                  <Check size={11} style={{ color: '#1A1A1A', strokeWidth: 3 }} />
                                </div>
                                <span className="text-xs font-bold" style={{ color: '#7DBB91', fontFamily: poppins }}>
                                  Geofencing
                                </span>
                              </div>
                              <TableCell value={row.geofencing} isDark={isDark} variant="geo" />
                            </div>

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>

            {/* ── Desktop scrollable table (hidden below md) ─────────────── */}
            <div className="overflow-x-auto hidden md:block" style={{ WebkitOverflowScrolling: 'touch' }}
              role="region" aria-label="Platform comparison table — scroll to see all columns">
              <div style={{ minWidth: 920 }}>

                {/* Column headers */}
                <div className="flex items-stretch"
                  style={{ background: isDark ? 'rgba(28,28,29,0.55)' : 'rgba(246,246,246,0.80)', borderBottom: `1px solid ${borderColor}` }}>
                  {/* Feature sticky */}
                  <div className="flex-shrink-0 px-4 py-3 flex items-center"
                    style={{ width: 170, position: 'sticky', left: 0, zIndex: 20, background: headerSticky, borderRight: `1px solid ${borderColor}` }}>
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: textMuted }}>Feature</span>
                  </div>
                  {/* CookReels */}
                  <div className="flex-shrink-0 px-4 py-3 flex flex-col justify-center"
                    style={{ width: 220, background: isDark ? 'rgba(245,197,24,0.07)' : 'rgba(245,197,24,0.045)', borderLeft: `2px solid ${crBorder}`, borderRight: `2px solid ${crBorder}`, borderTop: `2px solid ${crBorder}`, boxShadow: '0 0 28px rgba(245,197,24,0.08)' }}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold" style={{ color: '#F5C518', fontFamily: poppins }}>CookReels</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: '#F5C518', color: '#1A1A1A' }}>★ Boost</span>
                    </div>
                    <p className="text-[10px]" style={{ color: textMuted }}>Food-First Platform</p>
                  </div>
                  {/* Meta */}
                  <div className="flex-1 px-4 py-3 flex flex-col justify-center" style={{ minWidth: 140, borderLeft: `1px solid ${borderColor}` }}>
                    <span className="text-xs font-bold" style={{ color: textPrimary }}>Meta Ads</span>
                    <span className="text-[10px] mt-0.5" style={{ color: textMuted }}>Social Media</span>
                  </div>
                  {/* Google */}
                  <div className="flex-1 px-4 py-3 flex flex-col justify-center" style={{ minWidth: 140, borderLeft: `1px solid ${borderColor}` }}>
                    <span className="text-xs font-bold" style={{ color: textPrimary }}>Google Ads</span>
                    <span className="text-[10px] mt-0.5" style={{ color: textMuted }}>Search & Display</span>
                  </div>
                  {/* Geofencing */}
                  <div className="flex-shrink-0 px-4 py-3 flex flex-col justify-center"
                    style={{ width: 200, background: isDark ? 'rgba(125,187,145,0.07)' : 'rgba(125,187,145,0.04)', borderLeft: `2px solid ${geoBorder}`, borderRight: `2px solid ${geoBorder}`, borderTop: `2px solid ${geoBorder}`, boxShadow: '0 0 28px rgba(125,187,145,0.06)' }}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold" style={{ color: '#7DBB91', fontFamily: poppins }}>Geofencing</span>
                      <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold" style={{ background: '#7DBB91', color: '#1A1A1A' }}>★ New</span>
                    </div>
                    <p className="text-[10px]" style={{ color: textMuted }}>Location-Based</p>
                  </div>
                </div>

                {/* Data rows */}
                {COMPARISON_ROWS.map((row, rowIdx) => {
                  const isAlt  = rowIdx % 2 === 1
                  const isLast = rowIdx === COMPARISON_ROWS.length - 1
                  return (
                    <div key={row.feature} className="flex items-stretch"
                      style={{ borderBottom: isLast ? 'none' : `1px solid ${borderColor}`, background: isAlt ? rowAltBg : 'transparent' }}>
                      {/* Feature sticky */}
                      <div className="flex-shrink-0 px-4 py-4 flex items-start"
                        style={{ width: 170, position: 'sticky', left: 0, zIndex: 10, background: isAlt ? stickyAlt : stickyEven, borderRight: `1px solid ${borderColor}` }}>
                        <span className="text-xs font-semibold leading-snug" style={{ color: textPrimary }}>{row.feature}</span>
                      </div>
                      {/* CookReels */}
                      <div className="flex-shrink-0 px-4 py-4" style={{ width: 220, background: crColBg, borderLeft: `2px solid ${crBorder}`, borderRight: `2px solid ${crBorder}`, borderBottom: isLast ? `2px solid ${crBorder}` : undefined }}>
                        <TableCell value={row.cookreels} isDark={isDark} variant="cr" />
                      </div>
                      {/* Meta */}
                      <div className="flex-1 px-4 py-4" style={{ minWidth: 140, borderLeft: `1px solid ${borderColor}` }}>
                        <TableCell value={row.meta} isDark={isDark} />
                      </div>
                      {/* Google */}
                      <div className="flex-1 px-4 py-4" style={{ minWidth: 140, borderLeft: `1px solid ${borderColor}` }}>
                        <TableCell value={row.google} isDark={isDark} />
                      </div>
                      {/* Geofencing */}
                      <div className="flex-shrink-0 px-4 py-4" style={{ width: 200, background: geoColBg, borderLeft: `2px solid ${geoBorder}`, borderRight: `2px solid ${geoBorder}`, borderBottom: isLast ? `2px solid ${geoBorder}` : undefined }}>
                        <TableCell value={row.geofencing} isDark={isDark} variant="geo" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Complementary note */}
            <div className="m-5 p-4 rounded-2xl" style={{ background: isDark ? 'rgba(30,30,31,0.60)' : 'rgba(245,197,24,0.04)', border: '1px solid rgba(245,197,24,0.20)' }}>
              <p className="text-xs leading-relaxed text-center" style={{ color: textMuted }}>
                <span style={{ color: '#F5C518', fontWeight: 600 }}>CookReels Boost</span> helps you reach highly engaged food lovers inside the CookReels ecosystem, while{' '}
                <span style={{ color: '#7DBB91', fontWeight: 600 }}>Geofencing</span> extends your reach beyond the platform by targeting real-world locations, competitor stores, events, shopping malls and nearby audiences. Together they create a complete omnichannel marketing strategy.
              </p>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          COOKREELS BOOST FEATURES
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="boost">
        <FadeUp delay={0.05}>
          <div className="rounded-2xl p-6 sm:p-8" style={cardStyle}>
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(245,197,24,0.14)', border: '1px solid rgba(245,197,24,0.32)', color: '#F5C518' }}>
                  ✦ CookReels Boost
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: textPrimary, fontFamily: poppins }}>
                Advertise Inside the CookReels Ecosystem
              </h2>
              <p className="text-sm sm:text-base max-w-xl mx-auto leading-relaxed" style={{ color: textMuted }}>
                Reach food lovers where they spend time — discovering recipes, watching cooking reels and exploring restaurants.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BOOST_FEATURES.map((feat, i) => {
                const Icon = feat.icon
                return (
                  <motion.div key={feat.title}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="rounded-2xl p-5 cursor-default"
                    style={{ background: feat.bg, border: `1px solid ${feat.color}22` }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: `${feat.color}18`, border: `1px solid ${feat.color}30` }}>
                      <Icon size={18} style={{ color: feat.color }} />
                    </div>
                    <h4 className="text-sm font-bold mb-2" style={{ color: textPrimary, fontFamily: poppins }}>{feat.title}</h4>
                    <p className="text-xs leading-relaxed" style={{ color: textMuted }}>{feat.desc}</p>
                  </motion.div>
                )
              })}
            </div>
            <div className="mt-6 flex justify-center">
              <Link href="/boost/create?platform=cookreels">
                <motion.span whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)', color: '#1A1A1A', boxShadow: '0 4px 16px rgba(245,197,24,0.35)', fontFamily: poppins }}>
                  Launch CookReels Boost <ArrowRight size={14} />
                </motion.span>
              </Link>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          GEOFENCING SECTION
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="geofencing">
        <FadeUp delay={0.05}>
          <div className="rounded-2xl p-6 sm:p-8" style={cardStyle}>
            {/* Section header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold"
                  style={{ background: 'rgba(125,187,145,0.14)', border: '1px solid rgba(125,187,145,0.32)', color: '#7DBB91' }}>
                  ✦ Geofencing Advertising
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: textPrimary, fontFamily: poppins }}>
                Precision{' '}
                <span style={{ background: 'linear-gradient(135deg, #7DBB91, #5BA070)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  Geofencing Advertising
                </span>
              </h2>
              <p className="text-sm sm:text-base max-w-2xl mx-auto leading-relaxed" style={{ color: textMuted }}>
                Reach customers based on where they go, not just what they search. Deliver highly targeted campaigns
                around competitor locations, shopping malls, restaurants, events, offices, colleges, stadiums and more.
              </p>
            </div>

            {/* ── 1. Feature Cards (3 × 2 grid) ───────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {GEO_FEATURES.map((feat, i) => {
                const Icon = feat.icon
                return (
                  <motion.div key={feat.title}
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="rounded-2xl p-5 relative cursor-default overflow-hidden"
                    style={{ background: feat.bg, border: `1px solid ${feat.color}28` }}
                  >
                    {/* Badge */}
                    <span
                      className="absolute top-4 right-4 px-2 py-0.5 rounded-full text-[9px] font-bold"
                      style={{ background: `${feat.color}18`, color: feat.color, border: `1px solid ${feat.color}30` }}
                    >
                      {feat.badge}
                    </span>

                    {/* Icon */}
                    <motion.div
                      whileHover={{ rotate: [0, -8, 8, 0] }}
                      transition={{ duration: 0.4 }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: `${feat.color}18`, border: `1px solid ${feat.color}30` }}
                    >
                      <Icon size={18} style={{ color: feat.color }} />
                    </motion.div>

                    <h4
                      className="text-sm font-bold mb-2 pr-20"
                      style={{ color: textPrimary, fontFamily: poppins }}
                    >
                      {feat.title}
                    </h4>
                    <p className="text-xs leading-relaxed" style={{ color: textMuted }}>{feat.desc}</p>

                    {/* Corner glow */}
                    <div
                      className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full pointer-events-none"
                      style={{ background: `${feat.color}10`, filter: 'blur(18px)' }}
                    />
                  </motion.div>
                )
              })}
            </div>

            {/* ── 2. YouTube Video (centered, full-width) ──────────────────── */}
            <FadeUp delay={0.1}>
              <div className="max-w-3xl mx-auto mb-7">
                <div
                  className="relative rounded-2xl overflow-hidden w-full"
                  style={{
                    aspectRatio: '16/9',
                    border: `1px solid ${isDark ? 'rgba(125,187,145,0.28)' : 'rgba(125,187,145,0.35)'}`,
                    boxShadow: isDark
                      ? '0 12px 40px rgba(0,0,0,0.50), 0 0 0 1px rgba(125,187,145,0.15)'
                      : '0 12px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(125,187,145,0.12)',
                  }}
                >
                  {!videoPlaying ? (
                    <button
                      onClick={() => setVideoPlaying(true)}
                      className="w-full h-full relative block"
                      aria-label="Play Geofencing Advertising demo video"
                    >
                      {/* Thumbnail */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://img.youtube.com/vi/F0sIL3UnKn8/maxresdefault.jpg"
                        alt="Geofencing Advertising demo"
                        className="w-full h-full object-cover"
                      />

                      {/* Dark gradient overlay */}
                      <div
                        className="absolute inset-0"
                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.20) 50%, rgba(0,0,0,0.10) 100%)' }}
                      />

                      {/* Play button */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          whileHover={{ scale: 1.12 }}
                          whileTap={{ scale: 0.96 }}
                          className="flex items-center justify-center"
                          style={{
                            width: 72,
                            height: 72,
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.94)',
                            boxShadow: '0 6px 28px rgba(0,0,0,0.35)',
                          }}
                        >
                          <Play size={26} style={{ color: '#1A1A1A', marginLeft: 4 }} />
                        </motion.div>
                      </div>

                      {/* Bottom label */}
                      <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
                        <span
                          className="px-3 py-1.5 rounded-xl text-xs font-bold"
                          style={{ background: 'rgba(0,0,0,0.70)', color: '#fff', backdropFilter: 'blur(10px)' }}
                        >
                          📍 Geofencing Advertising — How It Works
                        </span>
                      </div>
                    </button>
                  ) : (
                    <iframe
                      src="https://www.youtube.com/embed/F0sIL3UnKn8?autoplay=1&rel=0"
                      title="Geofencing Advertising demo"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  )}
                </div>

                <p className="text-xs text-center mt-3" style={{ color: textMuted }}>
                  See how precision geofencing delivers your ads to exactly the right people at exactly the right time
                </p>
              </div>
            </FadeUp>

            {/* ── 3. CTA Button ────────────────────────────────────────────── */}
            <div className="flex justify-center">
              <Link href="/boost/create?platform=geofencing">
                <motion.span
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-bold cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #7DBB91, #5BA070)',
                    color: '#fff',
                    boxShadow: '0 6px 24px rgba(125,187,145,0.35)',
                    fontFamily: poppins,
                  }}
                >
                  Launch Geofencing Campaign <ArrowRight size={15} />
                </motion.span>
              </Link>
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          HOW GEOFENCING WORKS — Timeline
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works">
        <FadeUp delay={0.05}>
          <div className="rounded-2xl p-6 sm:p-8" style={cardStyle}>
            <div className="text-center mb-10">
              <div className="flex justify-center mb-4">
                <SectionLabel icon={MapPin}>How It Works</SectionLabel>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: textPrimary, fontFamily: poppins }}>
                Launch a Geofencing Campaign in 4 Steps
              </h2>
            </div>

            {/* Desktop: 4-col horizontal; Mobile: vertical list */}
            <div className="hidden md:grid md:grid-cols-4 gap-4">
              {TIMELINE_STEPS.map((step, i) => {
                const Icon = step.icon
                return (
                  <div key={step.title} className="relative">
                    <motion.div
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                      className="rounded-2xl p-5"
                      style={{ background: isDark ? 'rgba(30,30,31,0.60)' : 'rgba(248,248,248,0.70)', border: `1px solid ${step.color}20` }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ background: `${step.color}18`, border: `1px solid ${step.color}30` }}>
                          <Icon size={16} style={{ color: step.color }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: step.color }}>Step {step.step}</span>
                      </div>
                      <h4 className="text-sm font-bold mb-2" style={{ color: textPrimary, fontFamily: poppins }}>{step.title}</h4>
                      <p className="text-xs leading-relaxed" style={{ color: textMuted }}>{step.desc}</p>
                    </motion.div>
                    {/* Connecting arrow */}
                    {i < TIMELINE_STEPS.length - 1 && (
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        whileInView={{ opacity: 1, scaleX: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.4, delay: i * 0.12 + 0.3 }}
                        className="absolute top-1/2 -right-3 -translate-y-1/2 z-10"
                      >
                        <ArrowRight size={16} style={{ color: step.color, opacity: 0.6 }} />
                      </motion.div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Mobile: vertical timeline */}
            <div className="md:hidden space-y-0">
              {TIMELINE_STEPS.map((step, i) => {
                const Icon = step.icon
                return (
                  <div key={step.title} className="flex gap-4">
                    {/* Left: icon + line */}
                    <div className="flex flex-col items-center">
                      <motion.div
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.35, delay: i * 0.1, type: 'spring', stiffness: 300 }}
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: `${step.color}18`, border: `1px solid ${step.color}30` }}
                      >
                        <Icon size={16} style={{ color: step.color }} />
                      </motion.div>
                      {i < TIMELINE_STEPS.length - 1 && (
                        <motion.div
                          initial={{ scaleY: 0 }}
                          whileInView={{ scaleY: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.4, delay: i * 0.1 + 0.25, ease: 'easeOut' }}
                          className="w-0.5 flex-1 mt-1 mb-1 origin-top"
                          style={{ background: `linear-gradient(to bottom, ${step.color}50, ${TIMELINE_STEPS[i + 1].color}50)` }}
                        />
                      )}
                    </div>
                    {/* Right: content */}
                    <div className="pb-7 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: step.color }}>
                        Step {step.step}
                      </span>
                      <h4 className="text-sm font-bold mt-0.5 mb-1.5" style={{ color: textPrimary, fontFamily: poppins }}>{step.title}</h4>
                      <p className="text-xs leading-relaxed" style={{ color: textMuted }}>{step.desc}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          ADVERTISING CHANNELS
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="channels">
        <FadeUp delay={0.05}>
          <div className="rounded-2xl p-6 sm:p-8" style={cardStyle}>
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <SectionLabel icon={Globe}>One Campaign. Every Screen.</SectionLabel>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: textPrimary, fontFamily: poppins }}>
                Launch Across Multiple Channels
              </h2>
              <p className="text-sm sm:text-base max-w-xl mx-auto leading-relaxed" style={{ color: textMuted }}>
                Run campaigns across multiple advertising channels from a single platform.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {CHANNELS.map((ch, i) => {
                const Icon = ch.icon
                return (
                  <motion.div key={ch.title}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-30px' }}
                    transition={{ duration: 0.45, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ scale: 1.05, y: -4 }}
                    className="rounded-2xl p-4 flex flex-col items-center text-center gap-2 cursor-default"
                    style={{ background: isDark ? 'rgba(30,30,31,0.60)' : 'rgba(248,248,248,0.80)', border: `1px solid ${borderColor}` }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = `${ch.color}40`; el.style.boxShadow = `0 4px 20px ${ch.color}18` }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = borderColor; el.style.boxShadow = 'none' }}
                  >
                    <motion.div
                      whileHover={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 0.4 }}
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${ch.color}15`, border: `1px solid ${ch.color}28` }}>
                      <Icon size={18} style={{ color: ch.color }} />
                    </motion.div>
                    <p className="text-xs font-bold" style={{ color: textPrimary }}>{ch.title}</p>
                    <p className="text-[10px] leading-snug" style={{ color: textMuted }}>{ch.desc}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          BUSINESS TYPES
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="businesses">
        <FadeUp delay={0.05}>
          <div className="rounded-2xl p-6 sm:p-8" style={cardStyle}>
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: textPrimary, fontFamily: poppins }}>
                Perfect for These Businesses
              </h2>
              <p className="text-sm" style={{ color: textMuted }}>
                From local restaurants to global food brands — CookReels has your audience covered.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {BUSINESSES.map((biz, i) => (
                <motion.div key={biz.title}
                  initial={{ opacity: 0, scale: 0.94 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.4, delay: i * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ scale: 1.06, y: -4 }}
                  whileTap={{ scale: 0.96 }}
                  className="rounded-2xl p-3 flex flex-col items-center text-center gap-1.5 cursor-default"
                  style={{ background: isDark ? 'rgba(30,30,31,0.60)' : 'rgba(248,248,248,0.80)', border: `1px solid ${borderColor}`, transition: 'border-color 0.2s, box-shadow 0.2s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'rgba(245,197,24,0.40)'; el.style.boxShadow = '0 4px 20px rgba(245,197,24,0.12)' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = borderColor; el.style.boxShadow = 'none' }}
                >
                  <motion.span
                    className="text-xl select-none"
                    whileHover={{ y: -4, scale: 1.2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 16 }}
                  >
                    {biz.emoji}
                  </motion.span>
                  <p className="text-[11px] font-bold leading-tight" style={{ color: textPrimary }}>{biz.title}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FAQ
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="faq">
        <FadeUp delay={0.05}>
          <div className="rounded-2xl p-6 sm:p-8" style={cardStyle}>
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: textPrimary, fontFamily: poppins }}>
                Frequently Asked Questions
              </h2>
              <p className="text-sm" style={{ color: textMuted }}>
                Everything you need to know about CookReels advertising products.
              </p>
            </div>
            <div className="max-w-2xl mx-auto space-y-3">
              {FAQ_ITEMS.map((item, i) => (
                <FaqAccordionItem
                  key={i}
                  item={item}
                  isOpen={openFaq === i}
                  onToggle={() => setOpenFaq(openFaq === i ? null : i)}
                  isDark={isDark}
                  textPrimary={textPrimary}
                  textMuted={textMuted}
                  borderColor={borderColor}
                />
              ))}
            </div>
          </div>
        </FadeUp>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          FINAL CTA
          ═══════════════════════════════════════════════════════════════════ */}
      <section id="cta">
        <FadeUp delay={0.05}>
          <div
            className="rounded-2xl p-8 sm:p-12 relative overflow-hidden"
            style={{
              background: isDark
                ? 'linear-gradient(135deg, rgba(245,197,24,0.12) 0%, rgba(125,187,145,0.08) 50%, rgba(43,43,45,0.60) 100%)'
                : 'linear-gradient(135deg, rgba(245,197,24,0.14) 0%, rgba(125,187,145,0.08) 60%, rgba(255,255,255,0.85) 100%)',
              border: '1px solid rgba(245,197,24,0.25)',
              boxShadow: isDark ? '0 8px 40px rgba(245,197,24,0.08)' : '0 8px 40px rgba(245,197,24,0.06)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Background floating emojis */}
            {['🍕', '🍜', '🥗', '🍰', '🥘', '🍱'].map((emoji, i) => (
              <motion.span key={i} className="absolute select-none pointer-events-none"
                style={{ top: `${8 + (i * 14) % 72}%`, left: `${3 + (i * 15) % 94}%`, fontSize: '2.2rem', opacity: isDark ? 0.07 : 0.09 }}
                animate={{ y: [0, -10, 0], rotate: [0, i % 2 === 0 ? 7 : -7, 0] }}
                transition={{ duration: 3.5 + i * 0.5, repeat: Infinity, ease: 'easeInOut', delay: i * 0.35 }}>
                {emoji}
              </motion.span>
            ))}

            <div className="relative z-10 text-center max-w-2xl mx-auto">
              <motion.span className="block text-5xl mb-5 select-none"
                animate={{ scale: [1, 1.08, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
                🚀
              </motion.span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 leading-tight"
                style={{ color: textPrimary, fontFamily: poppins }}>
                Ready to Reach{' '}
                <span style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  More Customers?
                </span>
              </h2>
              <p className="text-sm sm:text-base mb-8 leading-relaxed max-w-xl mx-auto" style={{ color: textMuted }}>
                Use CookReels Boost to engage food lovers inside the CookReels community, and expand your
                reach with precision Geofencing campaigns across mobile, video, connected TV, display and social channels.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/boost/create?platform=cookreels">
                  <motion.span role="button" aria-label="Launch CookReels Boost"
                    whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl text-sm font-bold cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #F5C518, #FFB800)', color: '#1A1A1A', boxShadow: '0 6px 24px rgba(245,197,24,0.40)', fontFamily: poppins }}>
                    Launch CookReels Boost <ArrowRight size={14} />
                  </motion.span>
                </Link>
                <Link href="/boost/create?platform=geofencing">
                  <motion.span role="button" aria-label="Launch Geofencing Campaign"
                    whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 px-7 py-3 rounded-2xl text-sm font-bold cursor-pointer"
                    style={{ background: 'linear-gradient(135deg, #7DBB91, #5BA070)', color: '#fff', boxShadow: '0 6px 24px rgba(125,187,145,0.35)', fontFamily: poppins }}>
                    Launch Geofencing Campaign <ArrowRight size={14} />
                  </motion.span>
                </Link>
              </div>
            </div>
          </div>
        </FadeUp>
      </section>

    </div>
  )
}
