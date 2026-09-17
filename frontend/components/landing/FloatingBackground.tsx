'use client'

import { motion } from 'framer-motion'

export function FloatingBackground({ dense = false }: { dense?: boolean }) {
  const orbs = [
    { size: 300, x: '5%', y: '10%', color: 'rgba(37, 99, 235, 0.15)', duration: 20 },
    { size: 250, x: '70%', y: '20%', color: 'rgba(124, 58, 237, 0.12)', duration: 25 },
    { size: 200, x: '40%', y: '60%', color: 'rgba(255, 153, 51, 0.1)', duration: 18 },
    { size: 180, x: '85%', y: '70%', color: 'rgba(19, 136, 8, 0.08)', duration: 22 },
    ...(dense
      ? [
          { size: 150, x: '15%', y: '75%', color: 'rgba(124, 58, 237, 0.1)', duration: 16 },
          { size: 120, x: '55%', y: '5%', color: 'rgba(37, 99, 235, 0.1)', duration: 14 },
        ]
      : []),
  ]

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base gradient mesh */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at top left, rgba(37, 99, 235, 0.05), transparent 50%), radial-gradient(ellipse at bottom right, rgba(124, 58, 237, 0.05), transparent 50%)',
        }}
      />
      {/* Floating orbs */}
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: orb.color,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 2,
          }}
        />
      ))}
    </div>
  )
}
