'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/landing/cn'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, disabled, ...props }, ref) => {
    const base =
      'relative inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mitra-blue focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap'

    const variants = {
      primary:
        'text-white shadow-lg hover:shadow-xl bg-gradient-to-r from-mitra-blue to-mitra-purple hover:scale-[1.02]',
      secondary:
        'glass text-slate-800 dark:text-slate-100 hover:bg-white/80 dark:hover:bg-slate-800/80',
      ghost:
        'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800',
      outline:
        'border-2 border-mitra-blue/30 text-mitra-blue hover:bg-mitra-blue/10',
      danger:
        'text-white bg-gradient-to-r from-red-500 to-red-600 hover:shadow-lg hover:shadow-red-500/30',
      success:
        'text-white bg-gradient-to-r from-green-500 to-green-600 hover:shadow-lg hover:shadow-green-500/30',
    }

    const sizes = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-11 px-6 text-sm',
      lg: 'h-14 px-8 text-base',
    }

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...(props as HTMLMotionProps<'button'>)}
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </span>
        )}
        <span className={cn('flex items-center gap-2', loading && 'opacity-0')}>{children}</span>
      </motion.button>
    )
  }
)
Button.displayName = 'Button'
