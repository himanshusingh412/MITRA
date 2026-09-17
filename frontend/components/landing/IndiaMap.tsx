'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, MapPin } from 'lucide-react'
import { INDIA_STATE_PATHS, INDIA_INTERNAL_BORDERS } from '@/lib/landing/india-geo-data'

// ──────────────────────────────────────────────────
// Regional hub data — the points the comet visits
// Expanded to cover all major states and languages
// ──────────────────────────────────────────────────

interface StateHub {
  id: string
  name: string
  regionalName: string
  language: string
  languageLabel: string
  services: string
  words: { word: string; meaning: string }[]
}

const STATE_HUBS: StateHub[] = [
  {
    id: 'rajasthan', name: 'Rajasthan', regionalName: 'राजस्थान',
    language: 'Hindi', languageLabel: 'Hindi',
    services: 'Bhamashah · Jan Aadhaar · e-Mitra · Mukhyamantri Chiranjeevi',
    words: [
      { word: 'खम्मा घणी', meaning: 'Many greetings' },
      { word: 'पधारो म्हारे देस', meaning: 'Welcome to our land' },
    ],
  },
  {
    id: 'bihar', name: 'Bihar', regionalName: 'बिहार',
    language: 'Hindi', languageLabel: 'Hindi',
    services: 'Mukhyamantri Kanya Utthan · BSPCL · Bihar Student Credit Card',
    words: [
      { word: 'प्रणाम', meaning: 'Respectful greeting' },
      { word: 'का हाल बा?', meaning: 'How are you?' },
    ],
  },
  {
    id: 'uttar-pradesh', name: 'Uttar Pradesh', regionalName: 'उत्तर प्रदेश',
    language: 'Hindi', languageLabel: 'Hindi',
    services: 'Kanya Sumangala · Abhyudaya · Jansamvad',
    words: [
      { word: 'नमस्ते', meaning: 'Hello' },
      { word: 'धन्यवाद', meaning: 'Thank you' },
    ],
  },
  {
    id: 'telangana', name: 'Telangana', regionalName: 'తెలంగాణ',
    language: 'Telugu', languageLabel: 'Telugu',
    services: 'T-Wallet · Aasara · KCR Kit · Rythu Bharosa',
    words: [
      { word: 'నమస్తే', meaning: 'Hello' },
      { word: 'ధన్యవాదాలు', meaning: 'Thank you' },
    ],
  },
  {
    id: 'tamil-nadu', name: 'Tamil Nadu', regionalName: 'தமிழ்நாடு',
    language: 'Tamil', languageLabel: 'Tamil',
    services: 'Amma Canteen · Muthulakshmi Reddy · Free Laptop Scheme',
    words: [
      { word: 'வணக்கம்', meaning: 'Hello' },
      { word: 'நன்றி', meaning: 'Thank you' },
    ],
  },
  {
    id: 'west-bengal', name: 'West Bengal', regionalName: 'পশ্চিমবঙ্গ',
    language: 'Bengali', languageLabel: 'Bengali',
    services: 'Duare Sarkar · Kanyashree · Khadya Sathi · Swasthya Sathi',
    words: [
      { word: 'নমস্কার', meaning: 'Hello' },
      { word: 'ধন্যবাদ', meaning: 'Thank you' },
    ],
  },
  {
    id: 'gujarat', name: 'Gujarat', regionalName: 'ગુજરાત',
    language: 'Gujarati', languageLabel: 'Gujarati',
    services: 'Digital Gujarat · Mukhyamantri Kisan Sahay · Amrutam',
    words: [
      { word: 'નમસ્તે', meaning: 'Hello' },
      { word: 'આભાર', meaning: 'Thank you' },
    ],
  },
  {
    id: 'kerala', name: 'Kerala', regionalName: 'കേരളം',
    language: 'Malayalam', languageLabel: 'Malayalam',
    services: 'e-District · Kudumbashree · Akshaya · LIFE Mission',
    words: [
      { word: 'നമസ്കാരം', meaning: 'Hello' },
      { word: 'നന്ദി', meaning: 'Thank you' },
    ],
  },
  {
    id: 'karnataka', name: 'Karnataka', regionalName: 'ಕರ್ನಾಟಕ',
    language: 'Kannada', languageLabel: 'Kannada',
    services: 'Seva Sindhu · Bhoomi · Gruha Lakshmi · Anna Bhagya',
    words: [
      { word: 'ನಮಸ್ಕಾರ', meaning: 'Hello' },
      { word: 'ಧನ್ಯವಾದಗಳು', meaning: 'Thank you' },
    ],
  },
  {
    id: 'maharashtra', name: 'Maharashtra', regionalName: 'महाराष्ट्र',
    language: 'Marathi', languageLabel: 'Marathi',
    services: 'Aaple Sarkar · Ladki Bahin · MJPJAY · Shetkari Samman',
    words: [
      { word: 'नमस्कार', meaning: 'Hello' },
      { word: 'धन्यवाद', meaning: 'Thank you' },
    ],
  },
  {
    id: 'punjab', name: 'Punjab', regionalName: 'ਪੰਜਾਬ',
    language: 'Punjabi', languageLabel: 'Punjabi',
    services: 'M-Seva · Tirath Yatra · Mai Bhago · Ashirwad',
    words: [
      { word: 'ਨਮਸਤੇ', meaning: 'Hello' },
      { word: 'ਧੰਨਵਾਦ', meaning: 'Thank you' },
    ],
  },
  {
    id: 'nct-of-delhi', name: 'NCT of Delhi', regionalName: 'दिल्ली',
    language: 'Hindi', languageLabel: 'Hindi/Urdu',
    services: 'Mohalla Clinic · Ladli · Farishtey · Power Subsidy',
    words: [
      { word: 'नमस्ते', meaning: 'Hello' },
      { word: 'शुक्रिया', meaning: 'Thank you' },
    ],
  },
  {
    id: 'andhra-pradesh', name: 'Andhra Pradesh', regionalName: 'ఆంధ్రప్రదేశ్',
    language: 'Telugu', languageLabel: 'Telugu',
    services: 'YSR Rythu Bharosa · Arogyasri · Amma Vodi · Pension Kanuka',
    words: [
      { word: 'నమస్కారం', meaning: 'Hello' },
      { word: 'ధన్యవాదాలు', meaning: 'Thank you' },
    ],
  },
]

const TOP_STATS = [
  { value: '36', label: 'States & UTs' },
  { value: '11+', label: 'Indian languages' },
  { value: '200+', label: 'Gov schemes covered' },
]

const SCRIPT_CHARS = [
  'अ', 'आ', 'इ', 'क', 'ख', 'ग', 'घ', 'च', 'ज', 'त', 'थ', 'द', 'न', 'प', 'भ', 'म', 'य', 'र', 'ल', 'व',
  'அ', 'ஆ', 'க', 'ங', 'ச', 'ஜ', 'ஞ', 'த', 'ந', 'ப', 'ம', 'ய', 'ர', 'ல', 'வ', 'ழ', 'ள',
  'అ', 'ఆ', 'ఇ', 'క', 'గ', 'చ', 'జ', 'ట', 'డ', 'త', 'ద', 'న', 'ప', 'భ', 'మ', 'య', 'ర', 'ల', 'వ',
  'অ', 'আ', 'ই', 'ক', 'খ', 'গ', 'ঘ', 'চ', 'ছ', 'জ', 'ত', 'থ', 'দ', 'ন', 'প', 'ভ', 'ম', 'য', 'র', 'ল',
  'ક', 'ખ', 'ગ', 'ચ', 'જ', 'ત', 'થ', 'દ', 'ન', 'પ', 'મ', 'ય', 'ર', 'લ',
  'ಕ', 'ಖ', 'ಗ', 'ಚ', 'ಜ', 'ಟ', 'ಡ', 'ತ', 'ದ', 'ನ', 'ಪ', 'ಮ', 'ಯ', 'ರ', 'ಲ',
  'ക', 'ഖ', 'ഗ', 'ഘ', 'ച', 'ജ', 'ഞ', 'ത', 'ദ', 'ന', 'പ', 'ഭ', 'മ', 'യ', 'ര', 'ല', 'വ',
  'ਕ', 'ਖ', 'ਗ', 'ਚ', 'ਜ', 'ਤ', 'ਥ', 'ਦ', 'ਨ', 'ਪ', 'ਮ', 'ਯ', 'ਰ', 'ਲ',
  'ک', 'ا', 'ب', 'ت', 'س', 'ش', 'ع', 'ف', 'م', 'ن', 'و', 'ہ', 'ی',
]

// ──────────────────────────────────────────────────
// Animated Comet/Traveling Dot — visits all hubs sequentially
// ──────────────────────────────────────────────────

interface HubPoint {
  cx: number
  cy: number
  name: string
  id: string
}

function CometAnimation({ hubPoints }: { hubPoints: HubPoint[] }) {
  const [currentTarget, setCurrentTarget] = useState(0)

  useEffect(() => {
    if (hubPoints.length === 0) return
    const timer = setInterval(() => {
      setCurrentTarget((prev) => (prev + 1) % hubPoints.length)
    }, 2200) // Visit each point for 2.2s
    return () => clearInterval(timer)
  }, [hubPoints.length])

  if (hubPoints.length < 2) return null

  const from = hubPoints[currentTarget]
  const to = hubPoints[(currentTarget + 1) % hubPoints.length]

  return (
    <g key={currentTarget}>
      {/* Fire trail — fading circles behind the comet */}
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
        const t = i / 10
        const x = from.cx + (to.cx - from.cx) * t
        const y = from.cy + (to.cy - from.cy) * t
        const opacity = (1 - t) * 0.5
        const radius = 5 - i * 0.4
        return (
          <motion.circle
            key={i}
            cx={x}
            cy={y}
            r={Math.max(radius, 1)}
            fill="var(--color-saffron)"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, opacity, 0] }}
            transition={{ duration: 2.2, delay: i * 0.04, repeat: Infinity, repeatDelay: 0 }}
          />
        )
      })}

      {/* The main traveling dot with fire glow */}
      <motion.circle
        cx={from.cx}
        cy={from.cy}
        r="5"
        fill="var(--color-saffron)"
        filter="url(#comet-glow)"
        animate={{
          cx: [from.cx, to.cx],
          cy: [from.cy, to.cy],
        }}
        transition={{
          duration: 1.8,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatType: 'loop',
        }}
      />

      {/* Glow halo around the dot */}
      <motion.circle
        cx={from.cx}
        cy={from.cy}
        r="12"
        fill="none"
        stroke="var(--color-saffron)"
        strokeWidth="1.5"
        opacity="0.4"
        animate={{
          cx: [from.cx, to.cx],
          cy: [from.cy, to.cy],
          r: [8, 14, 8],
          opacity: [0.4, 0.1, 0.4],
        }}
        transition={{
          duration: 1.8,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatType: 'loop',
        }}
      />

      {/* Current target label */}
      <motion.text
        x={to.cx}
        y={to.cy - 16}
        textAnchor="middle"
        fill="var(--color-saffron)"
        fontSize="8"
        fontWeight="700"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 2.2, repeat: Infinity }}
        style={{ pointerEvents: 'none' }}
      >
        {to.name === 'NCT of Delhi' ? 'Delhi' : to.name}
      </motion.text>
    </g>
  )
}

// ──────────────────────────────────────────────────
// Floating script background
// ──────────────────────────────────────────────────
function ScriptBackground() {
  const [chars, setChars] = useState<
    { char: string; x: number; y: number; size: number; delay: number; duration: number; opacity: number }[]
  >([])

  useEffect(() => {
    const generated = Array.from({ length: 28 }, () => ({
      char: SCRIPT_CHARS[Math.floor(Math.random() * SCRIPT_CHARS.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 14 + Math.random() * 26,
      delay: Math.random() * 8,
      duration: 6 + Math.random() * 8,
      opacity: 0.03 + Math.random() * 0.08,
    }))
    setChars(generated)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {chars.map((c, i) => (
        <motion.span
          key={i}
          className="absolute font-serif text-saffron"
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            fontSize: `${c.size}px`,
            opacity: 0,
          }}
          animate={{
            opacity: [0, c.opacity, 0],
            y: [0, -30, -60],
          }}
          transition={{
            duration: c.duration,
            delay: c.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {c.char}
        </motion.span>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────
// State Popover Card
// ──────────────────────────────────────────────────
function StateCard({ hub, onClose }: { hub: StateHub; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ duration: 0.2 }}
      className="absolute z-50 w-72 max-w-[calc(100vw-2rem)]"
      style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
    >
      <div
        className="rounded-2xl p-5 backdrop-blur-xl bg-white/95 dark:bg-slate-900/95 border border-saffron-200/40 dark:border-saffron-500/20 shadow-lg"
        style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 0 20px rgba(255,153,51,0.08)' }}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 transition-colors text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="mb-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-saffron">STATE</div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{hub.name === 'NCT of Delhi' ? 'Delhi' : hub.name}</h3>
          <p className="text-sm text-saffron-dark dark:text-saffron-light">{hub.regionalName} / {hub.languageLabel}</p>
        </div>
        <div className="mb-4">
          <div className="text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-500 dark:text-slate-400">COMMON WORDS</div>
          <div className="flex flex-wrap gap-1.5">
            {hub.words.map((w, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg text-xs font-medium cursor-default bg-saffron-50 dark:bg-saffron-950/30 border border-saffron-200/50 dark:border-saffron-700/30 text-saffron-dark dark:text-saffron-light"
                title={w.meaning}
              >
                {w.word}
              </span>
            ))}
          </div>
        </div>
        <div className="mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">DIGITAL SERVICES</span>
          <p className="text-sm mt-1 text-slate-700 dark:text-slate-300">{hub.services}</p>
        </div>
        <a
          href="#digital-citizen"
          className="flex items-center gap-1 text-sm font-medium transition-colors text-saffron hover:text-saffron-dark dark:text-saffron-light"
        >
          Explore Digital Services
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </motion.div>
  )
}

// ──────────────────────────────────────────────────
// Main IndiaMap component
// ──────────────────────────────────────────────────
export function IndiaMap({ className }: { className?: string }) {
  const [activeHub, setActiveHub] = useState<StateHub | null>(null)
  const [hoveredState, setHoveredState] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const hubByName = useMemo(() => STATE_HUBS.reduce<Record<string, StateHub>>((acc, h) => {
    acc[h.name.toLowerCase()] = h
    return acc
  }, {}), [])

  // Build hub points (cx, cy from the geo data)
  const hubPoints = useMemo<HubPoint[]>(() => {
    return INDIA_STATE_PATHS
      .filter(s => hubByName[s.name.toLowerCase()])
      .map(s => ({ cx: s.cx, cy: s.cy, name: s.name, id: s.id }))
  }, [hubByName])

  const handleStateClick = useCallback((stateName: string) => {
    const hub = hubByName[stateName.toLowerCase()]
    if (hub) {
      setActiveHub((prev) => (prev?.id === hub.id ? null : hub))
    }
  }, [hubByName])

  useEffect(() => {
    if (!activeHub) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveHub(null)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [activeHub])

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden rounded-3xl bg-slate-50 dark:bg-navy-deep transition-colors duration-300 ${className || ''}`}
      style={{ minHeight: '620px' }}
    >
      <ScriptBackground />

      {/* Top Stats */}
      <div className="relative z-20 flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-8 pb-4 px-4">
        {TOP_STATS.map((stat, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping bg-saffron"
                style={{ animationDuration: '2s', animationDelay: `${i * 0.3}s` }}
              />
              <span
                className="relative inline-flex h-2.5 w-2.5 rounded-full bg-saffron"
                style={{ boxShadow: '0 0 8px var(--color-saffron)' }}
              />
            </span>
            <span className="text-sm sm:text-base text-slate-900 dark:text-slate-100">
              <span className="font-bold text-saffron dark:text-saffron-light">{stat.value}</span>{' '}
              <span className="text-slate-500 dark:text-slate-400">{stat.label}</span>
            </span>
          </div>
        ))}
      </div>

      {/* Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3 bg-white/80 dark:bg-navy-deep/80 border-t border-slate-200/50 dark:border-slate-700/30 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" style={{ boxShadow: '0 0 6px rgba(34,197,94,0.6)' }} />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            LIVE · CITIZEN SERVICES
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700" />
          <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline text-slate-400 dark:text-slate-500">
            ACTIVE HUBS · 11+ LANGUAGES
          </span>
          <span className="text-xs font-bold uppercase tracking-wider sm:hidden text-slate-400 dark:text-slate-500">
            11+ LANG
          </span>
        </div>
      </div>

      {/* Map */}
      <div className="relative z-10 flex items-center justify-center px-4 pb-12 pt-2">
        <div className="relative w-full max-w-2xl aspect-[4/5]">
          <svg
            viewBox="0 0 512 592"
            className="w-full h-full"
            role="img"
            aria-label="Interactive India map showing citizen service hubs and digital connectivity"
          >
            <defs>
              <filter id="india-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="comet-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="state-fill-default" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,153,51,0.06)" />
                <stop offset="100%" stopColor="rgba(255,153,51,0.02)" />
              </linearGradient>
              <linearGradient id="state-fill-hub" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,153,51,0.18)" />
                <stop offset="100%" stopColor="rgba(255,153,51,0.06)" />
              </linearGradient>
              <linearGradient id="state-fill-hover" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,153,51,0.35)" />
                <stop offset="100%" stopColor="rgba(255,153,51,0.12)" />
              </linearGradient>
            </defs>

            {/* State fills */}
            {INDIA_STATE_PATHS.map((state) => {
              const isHub = !!hubByName[state.name.toLowerCase()]
              const isHovered = hoveredState === state.name
              const isActive = activeHub?.name.toLowerCase() === state.name.toLowerCase()
              const fill = isActive || isHovered
                ? 'url(#state-fill-hover)'
                : isHub
                ? 'url(#state-fill-hub)'
                : 'url(#state-fill-default)'
              return (
                <path
                  key={state.id}
                  d={state.d}
                  fill={fill}
                  stroke="var(--color-saffron)"
                  strokeWidth={isHovered || isActive ? '1.2' : '0.6'}
                  strokeLinejoin="round"
                  style={{
                    transition: 'fill 0.2s ease, stroke-width 0.2s ease',
                    cursor: isHub ? 'pointer' : 'default',
                  }}
                  onMouseEnter={() => setHoveredState(state.name)}
                  onMouseLeave={() => setHoveredState(null)}
                  onClick={() => handleStateClick(state.name)}
                >
                  <title>{state.name}{isHub ? ' ★' : ''}</title>
                </path>
              )
            })}

            {/* Internal state borders (mesh) — shows district-level detail */}
            <path
              d={INDIA_INTERNAL_BORDERS}
              fill="none"
              stroke="var(--color-saffron)"
              strokeWidth="0.3"
              opacity="0.25"
              style={{ pointerEvents: 'none' }}
            />

            {/* Static hub markers */}
            {hubPoints.map((hp, i) => {
              const hub = STATE_HUBS[i]
              if (!hub) return null
              return (
                <g key={`marker-${i}`}>
                  <circle
                    cx={hp.cx}
                    cy={hp.cy}
                    r="3.5"
                    fill="var(--color-saffron)"
                    style={{
                      cursor: 'pointer',
                      filter: 'drop-shadow(0 0 3px var(--color-saffron))',
                    }}
                    onClick={() => handleStateClick(hp.name)}
                  />
                  <circle
                    cx={hp.cx}
                    cy={hp.cy}
                    r="9"
                    fill="transparent"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleStateClick(hp.name)}
                  />
                </g>
              )
            })}

            {/* Animated Comet — travels between hub points */}
            <CometAnimation hubPoints={hubPoints} />
          </svg>

          <AnimatePresence>
            {activeHub && <StateCard hub={activeHub} onClose={() => setActiveHub(null)} />}
          </AnimatePresence>

          {!activeHub && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500"
            >
              <MapPin className="w-3 h-3" />
              <span>Click a highlighted state to explore</span>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
