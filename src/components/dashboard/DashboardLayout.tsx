'use client'

import { motion } from 'framer-motion'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomNav } from './BottomNav'

interface DashboardLayoutProps {
  children: React.ReactNode
  username?: string
}

export function DashboardLayout({ children, username = 'Chef' }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden dark:bg-[#1E1E1F]" style={{ background: 'var(--cr-bg-main)' }}>
      {/* Sidebar — desktop only */}
      <Sidebar username={username} />

      {/* Main content column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Sticky glass header */}
        <Header username={username} />

        {/* Scrollable content */}
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="flex-1 overflow-y-auto relative"
        >
          {/* ── Cinematic ambient blobs ── */}
          <div
            className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
            aria-hidden="true"
          >
            {/* Top-right warm yellow blob */}
            <div
              className="absolute -top-64 -right-64 w-[700px] h-[700px] rounded-full animate-blob"
              style={{
                background: 'radial-gradient(circle, rgba(245,197,24,0.07) 0%, transparent 70%)',
                filter: 'blur(70px)',
              }}
            />
            {/* Mid-left soft blob */}
            <div
              className="absolute top-1/3 -left-48 w-[500px] h-[500px] rounded-full animate-blob-alt"
              style={{
                background: 'radial-gradient(circle, rgba(245,197,24,0.04) 0%, transparent 70%)',
                filter: 'blur(90px)',
              }}
            />
            {/* Bottom-right green blob */}
            <div
              className="absolute bottom-0 right-1/3 w-[450px] h-[450px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(125,187,145,0.05) 0%, transparent 70%)',
                filter: 'blur(80px)',
              }}
            />
            {/* Dark mode only: deep yellow center bloom */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] hidden dark:block"
              style={{
                background: 'radial-gradient(ellipse, rgba(245,197,24,0.025) 0%, transparent 70%)',
                filter: 'blur(60px)',
              }}
            />
            {/* Dark mode: orange secondary accent bloom */}
            <div
              className="absolute bottom-1/4 left-1/4 w-[400px] h-[300px] hidden dark:block"
              style={{
                background: 'radial-gradient(ellipse, rgba(255,159,28,0.03) 0%, transparent 70%)',
                filter: 'blur(80px)',
              }}
            />
          </div>

          {/* Dashboard content with bottom-nav spacing on mobile */}
          <div className="relative z-10 px-4 sm:px-6 pt-6 pb-20 lg:pb-4">
            {children}
          </div>
        </motion.main>
      </div>

      {/* Floating bottom nav — mobile only */}
      <BottomNav />
    </div>
  )
}
