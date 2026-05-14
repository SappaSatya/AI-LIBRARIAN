"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Status = "idle" | "listening" | "speaking";

interface UseVoiceOptions {
  onTranscript: (text: string) => void;
}

export function useVoice({ onTranscript }: UseVoiceOptions) {
  const [status, setStatus] = useState<Status>("idle");
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec || !window.speechSynthesis) {
      setSupported(false);
      return;
    }

    const rec = new SpeechRec();
    rec.lang = "en-US";
    rec.continuous = false;
    rec.interimResults = false;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript.trim();
      if (transcript) onTranscript(transcript);
    };

    rec.onend = () => setStatus("idle");
    rec.onerror = () => setStatus("idle");

    recognitionRef.current = rec;
    synthRef.current = window.speechSynthesis;
  }, [onTranscript]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || status !== "idle") return;
    window.speechSynthesis?.cancel();
    setStatus("listening");
    recognitionRef.current.start();
  }, [status]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setStatus("idle");
  }, []);

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onstart = () => setStatus("speaking");
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("idle");
    synthRef.current.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setStatus("idle");
  }, []);

  return { status, supported, startListening, stopListening, speak, stopSpeaking };
}
