"use client";

import { useEffect, useRef, useState, useCallback } from "react";

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}
interface SpeechRecognitionInstance extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

type Status = "idle" | "listening" | "speaking";

interface UseVoiceOptions {
  onTranscript: (text: string) => void;
  onSpeakEnd?: () => void;
}

export function useVoice({ onTranscript, onSpeakEnd }: UseVoiceOptions) {
  const [status, setStatus]         = useState<Status>("idle");
  const [supported, setSupported]   = useState(true);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const recognitionRef  = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef        = useRef<SpeechSynthesis | null>(null);
  const SpeechRecCtor   = useRef<(new () => SpeechRecognitionInstance) | null>(null);
  const micStreamRef    = useRef<MediaStream | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  const onSpeakEndRef   = useRef(onSpeakEnd);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onSpeakEndRef.current   = onSpeakEnd;   }, [onSpeakEnd]);

  useEffect(() => {
    const Ctor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor || !window.speechSynthesis) {
      setSupported(false);
      return;
    }
    SpeechRecCtor.current = Ctor;
    synthRef.current = window.speechSynthesis;
  }, []);

  const startListening = useCallback(async () => {
    if (!SpeechRecCtor.current || status !== "idle") return;
    setVoiceError(null);
    window.speechSynthesis?.cancel();

    // Explicitly acquire mic permission first — prevents the "network" error
    // that Chrome throws when SpeechRecognition starts before permission is granted
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the tracks immediately; we only needed this to warm up permission
      stream.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    } catch {
      setVoiceError("Microphone access denied — allow mic in browser settings and try again");
      return;
    }

    const rec = new SpeechRecCtor.current();
    rec.lang           = "en-US";
    rec.continuous     = false;
    rec.interimResults = false;

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript.trim();
      if (transcript) onTranscriptRef.current(transcript);
    };
    rec.onend = () => setStatus("idle");
    rec.onerror = (e) => {
      if (e.error !== "no-speech") {
        setVoiceError(
          e.error === "not-allowed"
            ? "Mic permission denied — allow microphone access in browser settings"
            : e.error === "network"
            ? "Network error — make sure you're connected to the internet (Chrome requires it for speech recognition)"
            : `Voice error: ${e.error}`
        );
      }
      setStatus("idle");
    };

    recognitionRef.current = rec;
    setStatus("listening");
    try {
      rec.start();
    } catch (err) {
      console.error("rec.start() threw:", err);
      setVoiceError("Could not start microphone. Try again.");
      setStatus("idle");
    }
  }, [status]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setStatus("idle");
  }, []);

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance   = new SpeechSynthesisUtterance(text);
    utterance.rate    = 1.0;
    utterance.pitch   = 1.0;
    utterance.onstart = () => setStatus("speaking");
    utterance.onend   = () => { setStatus("idle"); onSpeakEndRef.current?.(); };
    utterance.onerror = () => setStatus("idle");
    synthRef.current.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setStatus("idle");
  }, []);

  return { status, supported, voiceError, startListening, stopListening, speak, stopSpeaking };
}
