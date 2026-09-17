'use client'

import { Moon, Sun } from 'lucide-react'
import { motion } from 'framer-motion'
import { useStore } from '@/lib/store'

/** Light/dark switch. Uses MITRA's app-wide theme so the choice carries into the dashboard. */
export function ThemeToggle() {
  const { theme, toggleTheme } = useStore()

  return (
    <button
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-xl glass-card flex items-center justify-center hover:scale-110 transition-transform"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 text-amber-400" />
        ) : (
          <Moon className="w-5 h-5 text-slate-600" />
        )}
      </motion.div>
    </button>
  )
}
