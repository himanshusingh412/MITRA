'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Locale } from '@/types';

/**
 * Voice input and output for MITRA.
 *
 * Uses the browser's Web Speech API, which means real speech recognition and real
 * synthesis with **no API key and no audio leaving the device**. That matters for two
 * reasons: a citizen speaking about their income and disability status should not have
 * that audio shipped to a third party, and the prototype has to work for a judge who
 * clones the repo and runs one command.
 *
 * Browser support is uneven — Chrome and Edge implement recognition, Firefox does not.
 * Every consumer of this hook must handle `supported === false` by falling back to text
 * input rather than presenting a dead microphone button.
 *
 * In deployment, Whisper handles accented and code-mixed Indian speech considerably
 * better than the browser engine; `TECH_STACK.md` records that as the production path.
 * The hook's interface would not change.
 */

// The Web Speech API is not in TypeScript's DOM lib, so the shapes are declared here.
interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResult {
  readonly length: number;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

/**
 * BCP-47 tags for the languages MITRA supports. The regional variant matters:
 * `hi-IN` recognises Indian Hindi where a bare `hi` may not resolve at all.
 */
export const SPEECH_LOCALE: Record<Locale, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  mr: 'mr-IN',
};

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type VoiceErrorKind = 'permission' | 'no-speech' | 'network' | 'unsupported' | 'unknown';

export interface UseVoiceResult {
  /** Recognition is available in this browser. */
  supported: boolean;
  /** Synthesis is available in this browser. */
  canSpeak: boolean;
  listening: boolean;
  speaking: boolean;
  /** Text recognised so far, including the in-progress phrase. */
  transcript: string;
  /** Only the confirmed portion — safe to submit. */
  finalTranscript: string;
  error: { kind: VoiceErrorKind; message: string } | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
}

export function useVoice(locale: Locale, onFinal?: (text: string) => void): UseVoiceResult {
  const [supported, setSupported] = useState(false);
  const [canSpeak, setCanSpeak] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState('');
  const [final, setFinal] = useState('');
  const [error, setError] = useState<UseVoiceResult['error']>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  // Held in a ref so restarting recognition does not need to rebuild the instance.
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    setSupported(getRecognitionCtor() !== null);
    setCanSpeak(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  // Recognition is rebuilt when the language changes — `lang` cannot be reassigned
  // reliably on a live instance across browsers.
  useEffect(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = SPEECH_LOCALE[locale] ?? 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setError(null);
    };

    recognition.onresult = (event) => {
      let confirmed = '';
      let pending = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) confirmed += text;
        else pending += text;
      }
      setInterim(pending);
      if (confirmed) {
        setFinal((prev) => {
          const merged = (prev + ' ' + confirmed).trim();
          onFinalRef.current?.(merged);
          return merged;
        });
        setInterim('');
      }
    };

    recognition.onerror = (event) => {
      // Errors are translated into something a citizen can act on. "aborted" is what
      // fires when the user themselves stops, so it is not surfaced as a failure.
      const map: Record<string, { kind: VoiceErrorKind; message: string }> = {
        'not-allowed': {
          kind: 'permission',
          message: 'Microphone access was blocked. Allow it in your browser settings, or type instead.',
        },
        'service-not-allowed': {
          kind: 'permission',
          message: 'Microphone access was blocked. Allow it in your browser settings, or type instead.',
        },
        'no-speech': {
          kind: 'no-speech',
          message: 'I did not catch that. Try speaking again, a little closer to the microphone.',
        },
        network: {
          kind: 'network',
          message: 'Speech recognition needs a connection. You can still type your question.',
        },
        'audio-capture': {
          kind: 'unknown',
          message: 'No microphone found. You can still type your question.',
        },
      };
      if (event.error === 'aborted') {
        setListening(false);
        return;
      }
      setError(map[event.error] ?? { kind: 'unknown', message: 'Voice input did not work. Please type instead.' });
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      setInterim('');
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.onstart = null;
      try {
        recognition.abort();
      } catch {
        // Aborting an instance that never started throws in some browsers; harmless.
      }
      recognitionRef.current = null;
    };
  }, [locale]);

  const start = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError({
        kind: 'unsupported',
        message: 'This browser does not support voice input. Chrome or Edge do — or you can type.',
      });
      return;
    }
    setFinal('');
    setInterim('');
    setError(null);
    try {
      recognition.start();
    } catch {
      // start() throws if called while already running; treat as already listening.
      setListening(true);
    }
  }, []);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* already stopped */
    }
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setFinal('');
    setInterim('');
    setError(null);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

      // Reading a long reply aloud in full is worse than useless — strip markdown and
      // cap length so the citizen hears the answer, not a recital.
      const clean = text
        .replace(/\*\*/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 600);
      if (!clean) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = SPEECH_LOCALE[locale] ?? 'en-IN';
      // Slightly slower than default: this audience includes elderly and
      // first-time users, and the content is unfamiliar administrative language.
      utterance.rate = 0.92;
      utterance.pitch = 1;

      // Prefer a voice actually matching the language; browsers otherwise read
      // Devanagari with an English voice, which is unintelligible.
      const voices = window.speechSynthesis.getVoices();
      const target = SPEECH_LOCALE[locale] ?? 'en-IN';
      const match =
        voices.find((v) => v.lang === target) ??
        voices.find((v) => v.lang.startsWith(target.split('-')[0]));
      if (match) utterance.voice = match;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [locale],
  );

  const stopSpeaking = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  // Speech must never continue after the user navigates away.
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    supported,
    canSpeak,
    listening,
    speaking,
    transcript: (final + ' ' + interim).trim(),
    finalTranscript: final,
    error,
    start,
    stop,
    reset,
    speak,
    stopSpeaking,
  };
}
