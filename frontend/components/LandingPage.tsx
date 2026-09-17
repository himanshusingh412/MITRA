'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  MessageSquare, Heart, FileText, Rocket, Users, MapPin,
  Bell, ShieldCheck, Globe, Sparkles, ArrowRight, CheckCircle2, Mic, Languages,
  Search, BookOpen, X,
} from 'lucide-react'
import { FloatingBackground } from '@/components/landing/FloatingBackground'
import { MitraLogo } from '@/components/landing/Logo'
import { ThemeToggle } from '@/components/landing/ThemeToggle'
import { Button } from '@/components/landing/Button'
import { IndiaMap } from '@/components/landing/IndiaMap'
import { LanguageSwitcher } from '@/components/landing/LanguageSwitcher'
import { I18nProvider, useI18n } from '@/components/landing/I18nProvider'
import type { TranslationKey } from '@/lib/landing/translations'
import { AuthPanel } from '@/components/AuthPanel'

/**
 * The public landing page (design ported from mitra1).
 *
 * Sign-up and log-in buttons open MITRA's citizen auth dialog; a visitor who is already
 * signed in is sent to their dashboard instead.
 */
export function LandingPage({ signedIn }: { signedIn: boolean }) {
  const [authOpen, setAuthOpen] = useState(false)

  return (
    <I18nProvider>
      <div className="landing-v2">
        <LandingContent signedIn={signedIn} onSignIn={() => setAuthOpen(true)} />
      </div>
      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} />}
    </I18nProvider>
  )
}

/** Wraps a citizen call-to-action: dashboard link when signed in, auth dialog otherwise. */
function CitizenDoor({
  signedIn,
  onSignIn,
  className,
  children,
}: {
  signedIn: boolean
  onSignIn: () => void
  className?: string
  children: React.ReactNode
}) {
  if (signedIn) {
    return (
      <Link href="/dashboard" className={className}>
        {children}
      </Link>
    )
  }
  return (
    <span className={className} onClick={onSignIn}>
      {children}
    </span>
  )
}

function LandingContent({ signedIn, onSignIn }: { signedIn: boolean; onSignIn: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: containerRef })
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -50])
  const { t } = useI18n()

  const features = [
    { icon: MessageSquare, title: t('features.aiConversation.title'), desc: t('features.aiConversation.desc'), color: 'from-blue-500 to-cyan-500' },
    { icon: Heart, title: t('features.lifeEvent.title'), desc: t('features.lifeEvent.desc'), color: 'from-pink-500 to-rose-500' },
    { icon: Sparkles, title: t('features.eligibility.title'), desc: t('features.eligibility.desc'), color: 'from-purple-500 to-indigo-500' },
    { icon: FileText, title: t('features.document.title'), desc: t('features.document.desc'), color: 'from-amber-500 to-orange-500' },
    { icon: Rocket, title: t('features.application.title'), desc: t('features.application.desc'), color: 'from-green-500 to-emerald-500' },
    { icon: Users, title: t('features.family.title'), desc: t('features.family.desc'), color: 'from-violet-500 to-purple-500' },
    { icon: Bell, title: t('features.reminders.title'), desc: t('features.reminders.desc'), color: 'from-red-500 to-pink-500' },
    { icon: MapPin, title: t('features.csc.title'), desc: t('features.csc.desc'), color: 'from-teal-500 to-cyan-500' },
  ]

  const journey = [
    { step: 1, title: t('journey.step1.title'), desc: t('journey.step1.desc') },
    { step: 2, title: t('journey.step2.title'), desc: t('journey.step2.desc') },
    { step: 3, title: t('journey.step3.title'), desc: t('journey.step3.desc') },
    { step: 4, title: t('journey.step4.title'), desc: t('journey.step4.desc') },
  ]

  const stats = [
    { value: '12+', label: t('stats.schemes') },
    { value: '11', label: t('stats.languages') },
    { value: 'AI', label: t('stats.ai') },
    { value: '24/7', label: t('stats.available') },
  ]

  return (
    <div ref={containerRef} className="relative min-h-screen overflow-x-hidden">
      <FloatingBackground dense />

      {/* Nav */}
      <nav className="sticky top-0 z-50 px-2 sm:px-4 pt-4">
        <div className="max-w-7xl mx-auto glass rounded-2xl px-3 sm:px-6 py-3 flex items-center justify-between gap-2">
          <MitraLogo />
          <div className="flex items-center gap-1 sm:gap-3">
            <LanguageSwitcher />
            <CitizenDoor signedIn={signedIn} onSignIn={onSignIn} className="hidden sm:block">
              <Button variant="ghost" size="sm">{signedIn ? t('nav.dashboard') : t('nav.login')}</Button>
            </CitizenDoor>
            <CitizenDoor signedIn={signedIn} onSignIn={onSignIn}>
              <Button size="sm" className="px-3 sm:px-4">
                {signedIn ? t('nav.dashboard') : t('nav.getStarted')}
                <ArrowRight className="hidden sm:block w-4 h-4" />
              </Button>
            </CitizenDoor>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-20 pb-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8"
          >
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              🇮🇳 {t('hero.badge')}
            </span>
          </motion.div>

          <motion.div style={{ y: heroY }}>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight font-display leading-[1.05]"
            >
              <span className="gradient-text">{t('hero.title1')}</span>
              <br />
              <span className="text-3xl sm:text-4xl md:text-5xl">
                {t('hero.title2')}
              </span>
              <br />
              <span className="text-3xl sm:text-4xl md:text-5xl gradient-text-saffron">
                {t('hero.title3')}
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-8 text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
            >
              {t('hero.subtitle')}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="mt-10 flex flex-wrap items-center justify-center gap-4"
            >
              <CitizenDoor signedIn={signedIn} onSignIn={onSignIn}>
                <Button size="lg" className="group">
                  {signedIn ? t('nav.dashboard') : t('hero.cta.start')}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CitizenDoor>
              {!signedIn && (
                <CitizenDoor signedIn={signedIn} onSignIn={onSignIn}>
                  <Button variant="secondary" size="lg">
                    {t('hero.cta.account')}
                  </Button>
                </CitizenDoor>
              )}
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto"
            >
              {stats.map((stat) => (
                <div key={stat.label} className="glass-card p-4 text-center">
                  <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* India Map Section */}
      <section className="py-12 px-4" id="ai-showcase">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-slate-900 dark:text-white">
              {t('map.title')}
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              {t('map.subtitle')}
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <IndiaMap />
          </motion.div>
        </div>
      </section>

      {/* Digital Citizen Assistant Section */}
      <section id="digital-citizen" className="py-20 px-4 relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-saffron-50/50 via-transparent to-transparent dark:from-saffron-950/10" />

        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-saffron-100 dark:bg-saffron-900/30 text-saffron-dark dark:text-saffron-light text-sm font-semibold mb-4">
              <Globe className="w-4 h-4" />
              {t('dca.badge')}
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-slate-900 dark:text-white">
              {t('dca.title')}{' '}
              <span className="gradient-text-saffron">{t('dca.titleHighlight')}</span>
            </h2>
            <p className="mt-4 text-base text-slate-600 dark:text-slate-400 max-w-3xl mx-auto">
              {t('dca.subtitle')}
            </p>
          </motion.div>

          {/* Feature cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              { icon: Languages, key: 'feature1' },
              { icon: Search, key: 'feature2' },
              { icon: Mic, key: 'feature3' },
              { icon: BookOpen, key: 'feature4' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-saffron-400 to-saffron-600 flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2 text-slate-900 dark:text-white">{t(`dca.${item.key}.title` as TranslationKey)}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t(`dca.${item.key}.desc` as TranslationKey)}</p>
              </motion.div>
            ))}
          </div>

          {/* Stats banner */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-8"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { value: '50K+', label: t('dca.stat1') },
                { value: '11', label: t('dca.stat2') },
                { value: '200+', label: t('dca.stat3') },
                { value: '<3s', label: t('dca.stat4') },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-3xl font-bold gradient-text-saffron">{stat.value}</div>
                  <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-8"
          >
            <Link href="/assistant">
              <Button size="lg" className="bg-gradient-to-r from-saffron-500 to-saffron-600 hover:from-saffron-600 hover:to-saffron-700 text-white gap-2">
                <MessageSquare className="w-5 h-5" />
                {t('dca.cta')}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Journey Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold font-display">
              {t('journey.title').split(' ')[0]} <span className="gradient-text">{t('journey.title').split(' ').slice(1).join(' ')}</span>
            </h2>
            <p className="mt-4 text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              {t('journey.subtitle')}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {journey.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-mitra-blue to-mitra-purple flex items-center justify-center text-white font-bold text-lg mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-bold font-display">
              {t('features.title')}{' '}
              <span className="gradient-text">{t('features.titleHighlight')}</span>
            </h2>
            <p className="mt-4 text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              {t('features.subtitle')}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 4) * 0.1 }}
                className="glass-card p-6 group"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Showcase */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-8 sm:p-12"
          >
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 text-xs font-medium mb-4">
                  <Mic className="w-3 h-3" />
                  {t('aiShowcase.badge')}
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                  {t('aiShowcase.title')} <span className="gradient-text">{t('aiShowcase.titleHighlight')}</span>
                </h2>
                <p className="text-slate-500 dark:text-slate-400 mb-6">
                  {t('aiShowcase.desc')}
                </p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                  {['हिन्दी', 'English', 'தமிழ்', 'తెలుగు', 'বাংলা', 'ગુજરાતી'].map((lang) => (
                    <span key={lang} className="px-3 py-1 rounded-full glass text-sm font-medium">
                      {lang}
                    </span>
                  ))}
                  <span className="px-3 py-1 rounded-full glass text-sm font-medium text-slate-400">
                    {t('aiShowcase.more')}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <div className="space-y-3">
                  <div className="glass rounded-2xl rounded-tr-sm p-4 max-w-[90%] ml-auto">
                    <p className="text-sm">&ldquo;मैं एक किसान हूँ, उत्तर प्रदेश से। मुझे कौन सी योजनाएँ मिल सकती हैं?&rdquo;</p>
                  </div>
                  <div className="glass rounded-2xl rounded-tl-sm p-4 max-w-[90%]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-full gradient-mitra flex items-center justify-center text-xs text-white font-bold">M</div>
                      <span className="text-xs font-medium">MITRA AI</span>
                    </div>
                    <p className="text-sm">🌾 आपके लिए कुछ महत्वपूर्ण योजनाएँ: PM-Kisan (₹6,000/वर्ष), फसल बीमा योजना, किसान क्रेडिट कार्ड...</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Security */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-4">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">{t('security.badge')}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold font-display">
              {t('security.title')} <span className="gradient-text-saffron">{t('security.titleHighlight')}</span>
            </h2>
            <p className="mt-4 text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              {t('security.subtitle')}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: ShieldCheck, title: t('security.jwt.title'), desc: t('security.jwt.desc') },
              { icon: Globe, title: t('security.rbac.title'), desc: t('security.rbac.desc') },
              { icon: Languages, title: t('security.encrypted.title'), desc: t('security.encrypted.desc') },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-6 text-center"
              >
                <item.icon className="w-8 h-8 mx-auto mb-3 text-mitra-blue" style={{ color: 'var(--color-mitra-blue)' }} />
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="relative glass-card p-12 sm:p-16 overflow-hidden">
            <div className="absolute inset-0 gradient-mitra-soft opacity-50" />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold font-display mb-4">
                {t('cta.title')}
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto mb-8">
                {t('cta.subtitle')}
              </p>
              <CitizenDoor signedIn={signedIn} onSignIn={onSignIn}>
                <Button size="lg" className="group">
                  {signedIn ? t('nav.dashboard') : t('cta.button')}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CitizenDoor>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {t('cta.noAadhaar')}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {t('cta.multilingual')}
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {t('cta.free')}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <MitraLogo size={32} />
            <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
              {t('footer.copy')}
            </p>
            <div className="flex items-center gap-4 text-sm">
              <Link href="/admin/login" className="text-slate-500 hover:text-mitra-blue transition-colors">
                {t('nav.adminPortal')}
              </Link>
            </div>
          </div>
          <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-600">
            {t('footer.built')}
          </div>
        </div>
      </footer>
    </div>
  )
}


/**
 * Citizen authentication, in a modal (kept from MITRA's previous landing page).
 * Focus moves into the dialog, Escape closes it, and focus returns to the trigger.
 */
function AuthDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const returnFocusTo = useRef<Element | null>(null)

  useEffect(() => {
    returnFocusTo.current = document.activeElement
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    ref.current?.querySelector<HTMLElement>('input, button')?.focus()

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
      ;(returnFocusTo.current as HTMLElement | null)?.focus?.()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        className="surface route-enter max-h-[92dvh] w-full max-w-[440px] overflow-y-auto rounded-t-3xl p-6 shadow-[var(--elev-3)] sm:rounded-3xl sm:p-8"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <MitraLogo size={40} />
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="muted -mr-1.5 -mt-1.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-[var(--canvas)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p id="auth-dialog-title" className="sr-only">Citizen Portal</p>

        <AuthPanel redirectTo="/dashboard" />
      </div>
    </div>
  )
}
