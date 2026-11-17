import { useCallback, useEffect, useRef, useState } from "react";

// The browser's speech recognition isn't in TypeScript's DOM types everywhere, so describe the part we use.
interface RecognitionEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

/**
 * Speech to text using the browser's own recognition (Chrome, Edge, Safari). The audio never goes to our
 * servers: only the text does, once the customer presses the button to send it.
 */
export function useSpeechInput(lang: string, onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<Recognition | null>(null);
  const supported = getCtor() !== undefined;

  useEffect(() => () => ref.current?.stop(), []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    setError(null);
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (text) onText(text);
    };
    rec.onerror = (e) => {
      setError(
        e.error === "not-allowed" || e.error === "service-not-allowed"
          ? "Microphone access was blocked. Allow it in your browser, or type your request."
          : e.error === "no-speech"
            ? "We didn't hear anything. Try again."
            : "Voice input didn't work. You can type your request instead.",
      );
    };
    rec.onend = () => setListening(false);
    ref.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
    }
  }, [lang, onText]);

  const stop = useCallback(() => ref.current?.stop(), []);
  return { supported, listening, error, start, stop };
}
