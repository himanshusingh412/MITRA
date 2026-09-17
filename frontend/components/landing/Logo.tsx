'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/landing/cn'

export function MitraLogo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15 }}
        className="relative"
        style={{ width: size, height: size }}
      >
        <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
          {/* Outer ring - tricolor */}
          <motion.circle
            cx="24"
            cy="24"
            r="22"
            stroke="url(#tricolor)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="138.2"
            initial={{ strokeDashoffset: 138.2 }}
            animate={{ strokeDashoffset: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
          {/* AI Core - stylized M with chat element */}
          <defs>
            <linearGradient id="tricolor" x1="0" y1="0" x2="48" y2="48">
              <stop offset="0%" stopColor="#FF9933" />
              <stop offset="50%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#138808" />
            </linearGradient>
            <linearGradient id="coreGradient" x1="12" y1="12" x2="36" y2="36">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
          {/* Inner shape - chat bubble with M */}
          <path
            d="M16 14 H32 C34.2 14 36 15.8 36 18 V26 C36 28.2 34.2 30 32 30 H22 L16 35 V14 Z"
            fill="url(#coreGradient)"
            opacity="0.9"
          />
          {/* M letter */}
          <path
            d="M20 18 L20 26 M20 18 L23 22 L26 18 M26 18 L26 26"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </motion.div>
      <div className="flex flex-col leading-none">
        <span className="text-lg font-bold font-display tracking-tight">
          <span className="gradient-text">MITRA</span>
        </span>
        <span className="hidden sm:block whitespace-nowrap text-[10px] text-slate-500 dark:text-slate-400 font-medium">
          Citizen AI Companion
        </span>
      </div>
    </div>
  )
}

export function MitraLogoIcon({ size = 40 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size }}>
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <circle cx="24" cy="24" r="22" stroke="url(#tricolor-icon)" strokeWidth="2" strokeLinecap="round" />
        <defs>
          <linearGradient id="tricolor-icon" x1="0" y1="0" x2="48" y2="48">
            <stop offset="0%" stopColor="#FF9933" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#138808" />
          </linearGradient>
          <linearGradient id="coreGradient-icon" x1="12" y1="12" x2="36" y2="36">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
        </defs>
        <path
          d="M16 14 H32 C34.2 14 36 15.8 36 18 V26 C36 28.2 34.2 30 32 30 H22 L16 35 V14 Z"
          fill="url(#coreGradient-icon)"
          opacity="0.9"
        />
        <path
          d="M20 18 L20 26 M20 18 L23 22 L26 18 M26 18 L26 26"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </div>
  )
}
