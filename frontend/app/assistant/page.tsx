'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/shell';
import { SchemeRow } from '@/components/SchemeCard';
import { Button, Icon, Skeleton, cx } from '@/components/ui';
import { useStore } from '@/lib/store';
import { QUICK_PROMPTS, ask, newMessage } from '@/lib/assistant';
import { evaluateScheme } from '@/lib/eligibility';
import { getScheme } from '@/lib/schemes';
import { useVoice } from '@/lib/useVoice';
import Link from 'next/link';

function AssistantView() {
  const { user, locale, messages, addMessages, clearMessages, updateProfile } = useStore();
  const params = useSearchParams();
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);
  const sendRef = useRef<(text: string) => void>(() => {});

  const prompts = QUICK_PROMPTS[locale] ?? QUICK_PROMPTS.en;

  // Real speech recognition and synthesis, in-browser. No key, no audio leaves the device.
  const voice = useVoice(locale);

  async function send(text: string) {
    const q = text.trim();
    if (!q || thinking) return;

    addMessages([newMessage('user', q)]);
    setInput('');
    voice.reset();
    setThinking(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        // The route minimises this before anything leaves the server — no name, no
        // exact income, no caste category reaches the model.
        body: JSON.stringify({ message: q, profile: user, locale }),
      });

      if (res.ok) {
        const body = await res.json();
        const data = body?.data ?? body;
        if (data?.text) {
          const localReply = ask(q, user, locale);
          if (localReply.detectedEvents.length) {
            const merged = Array.from(new Set([...user.lifeEvents, ...localReply.detectedEvents]));
            if (merged.length !== user.lifeEvents.length) updateProfile({ lifeEvents: merged });
          }

          addMessages([
            newMessage('assistant', data.text, {
              schemeRefs: localReply.schemeRefs,
              actions: localReply.actions,
            }),
          ]);
          setThinking(false);
          if (speakReplies) voice.speak(data.text);
          return;
        }
      }
    } catch {
      // Fallback silently to offline reasoning engine
    }

    window.setTimeout(() => {
      const reply = ask(q, user, locale);

      if (reply.detectedEvents.length) {
        const merged = Array.from(new Set([...user.lifeEvents, ...reply.detectedEvents]));
        if (merged.length !== user.lifeEvents.length) updateProfile({ lifeEvents: merged });
      }

      addMessages([
        newMessage('assistant', reply.text, {
          schemeRefs: reply.schemeRefs,
          actions: reply.actions,
        }),
      ]);
      setThinking(false);

      if (speakReplies) voice.speak(reply.text);
    }, 450);
  }
  sendRef.current = send;

  // Submit automatically once recognition settles, so a voice-only user never has to
  // find and press a send button.
  useEffect(() => {
    if (!voice.finalTranscript || voice.listening) return;
    const text = voice.finalTranscript;
    const timer = window.setTimeout(() => {
      sendRef.current(text);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [voice.finalTranscript, voice.listening]);

  // Seed from ?q= so the home-screen search box lands straight in a conversation.
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    const q = params.get('q');
    if (q) send(q);
    else if (messages.length === 0) send('hello');
    // Arriving via the microphone button starts listening and turns on spoken replies.
    if (params.get('voice')) {
      setSpeakReplies(true);
      window.setTimeout(() => voice.start(), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, thinking]);

  return (
    <AppShell>
      <div id="main" className="mx-auto flex max-w-[900px] flex-col">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-emerald-400 text-white">
              <Icon name="Bot" className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">MITRA Assistant</h1>
              {/*
                This line is a promise to a citizen about their data, so it states
                exactly what happens: a cloud model writes the wording, eligibility is
                decided on this device, and the details sent are not identifying.
              */}
              <p className="muted text-xs">
                Answers are written by a secure cloud AI. Your eligibility is calculated
                on your device — your name, income and category are never sent.{' '}
                <Link href="/about#privacy" className="underline underline-offset-2">
                  What is shared
                </Link>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {voice.canSpeak && (
              <Button
                variant={speakReplies ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => {
                  if (speakReplies) voice.stopSpeaking();
                  setSpeakReplies((v) => !v);
                }}
                ariaLabel={speakReplies ? 'Turn off spoken replies' : 'Read replies aloud'}
              >
                <Icon name={speakReplies ? 'Volume2' : 'VolumeX'} className="h-4 w-4" />
                {speakReplies ? 'Speaking on' : 'Read aloud'}
              </Button>
            )}
            {messages.length > 1 && (
              <Button variant="secondary" size="sm" onClick={clearMessages}>
                <Icon name="RotateCcw" className="h-4 w-4" />
                New
              </Button>
            )}
          </div>
        </header>

        <div className="flex-1 space-y-5 pb-4" role="log" aria-live="polite" aria-label="Conversation">
          {messages.map((m) => (
            <div key={m.id} className={cx('flex gap-3', m.role === 'user' && 'justify-end')}>
              {m.role === 'assistant' && (
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15">
                  <Icon name="Bot" className="h-4 w-4" />
                </span>
              )}

              <div className={cx('min-w-0 max-w-[85%] space-y-3', m.role === 'user' && 'flex flex-col items-end')}>
                <div
                  className={cx(
                    'rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    m.role === 'user'
                      ? 'bg-brand-500 text-white'
                      : 'surface shadow-card',
                  )}
                >
                  {m.text.split('\n').map((line, i) =>
                    line.trim() === '' ? (
                      <span key={i} className="block h-2" />
                    ) : (
                      <p key={i} className={i > 0 ? 'mt-2' : undefined}>
                        {renderInline(line)}
                      </p>
                    ),
                  )}
                </div>

                {m.schemeRefs && m.schemeRefs.length > 0 && (
                  <div className="w-full space-y-2">
                    {m.schemeRefs.map((id) => {
                      const scheme = getScheme(id);
                      if (!scheme) return null;
                      return (
                        <SchemeRow key={id} scheme={scheme} result={evaluateScheme(user, scheme)} />
                      );
                    })}
                  </div>
                )}

                {m.actions && m.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {m.actions.map((a) => (
                      <Link
                        key={a.href}
                        href={a.href}
                        className="surface flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10"
                      >
                        {a.label}
                        <Icon name="ArrowRight" className="h-3.5 w-3.5" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex gap-3">
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500 dark:bg-brand-500/15">
                <Icon name="Bot" className="h-4 w-4" />
              </span>
              <div className="surface space-y-2 rounded-2xl px-4 py-3 shadow-card">
                <Skeleton className="h-3 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="sticky bottom-0 -mx-4 border-t border-[var(--border)] bg-[var(--canvas)]/90 px-4 py-4 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border sm:px-4">
          {voice.listening && (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-xl bg-brand-50 px-4 py-3 dark:bg-brand-500/15">
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-brand-400" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-brand-500" />
              </span>
              <p className="min-w-0 flex-1 text-sm font-semibold">
                {voice.transcript ? (
                  <span className="italic">&ldquo;{voice.transcript}&rdquo;</span>
                ) : (
                  'Listening — speak in your language'
                )}
              </p>
              <Button size="sm" variant="secondary" onClick={voice.stop}>
                Stop
              </Button>
            </div>
          )}

          {voice.speaking && (
            <div className="mb-3 flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-500/15">
              <Icon name="Volume2" className="h-4 w-4 shrink-0 text-emerald-600" />
              <p className="flex-1 text-sm font-semibold">Reading the answer aloud</p>
              <Button size="sm" variant="secondary" onClick={voice.stopSpeaking}>
                Stop
              </Button>
            </div>
          )}

          {voice.error && (
            <div
              role="alert"
              className="mb-3 flex items-start gap-3 rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-500/15"
            >
              <Icon name="MicOff" className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <p className="flex-1 text-sm">{voice.error.message}</p>
            </div>
          )}

          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <label htmlFor="chat-input" className="sr-only">
              Ask MITRA a question
            </label>
            <input
              id="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your situation in your own words…"
              className="input h-12 min-w-0 flex-1 px-4"
            />
            {/* Hidden entirely when unsupported — a dead microphone button is worse
                than none, because the citizen keeps trying it. */}
            {voice.supported && (
              <button
                type="button"
                onClick={() => {
                  if (voice.listening) {
                    voice.stop();
                  } else {
                    setSpeakReplies(true);
                    voice.start();
                  }
                }}
                aria-label={voice.listening ? 'Stop voice input' : 'Start voice input'}
                aria-pressed={voice.listening}
                className={cx(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-colors',
                  voice.listening
                    ? 'bg-rose-500 text-white'
                    : 'surface text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-500/10',
                )}
              >
                <Icon name={voice.listening ? 'Square' : 'Mic'} className="h-5 w-5" />
              </button>
            )}
            <button
              type="submit"
              disabled={!input.trim() || thinking}
              aria-label="Send"
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white transition-colors hover:bg-brand-600 disabled:opacity-40"
            >
              <Icon name="Send" className="h-5 w-5" />
            </button>
          </form>

          <div className="scrollbar-thin mt-3 flex gap-2 overflow-x-auto">
            {prompts.map((p) => (
              <button
                key={p.label}
                onClick={() => send(p.prompt)}
                className="surface flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold transition-colors hover:bg-brand-50 dark:hover:bg-brand-500/10"
              >
                <Icon name={p.icon} className="h-3.5 w-3.5 text-brand-500" />
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/** Renders **bold** segments without pulling in a full markdown dependency. */
function renderInline(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export default function AssistantPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="mx-auto max-w-[900px] space-y-4">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-24 w-full" />
          </div>
        </AppShell>
      }
    >
      <AssistantView />
    </Suspense>
  );
}
