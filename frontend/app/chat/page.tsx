"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Message } from "@/types";
import { sendChat } from "@/lib/api";
import ChatMessage from "@/components/ChatMessage";
import Sidebar from "@/components/Sidebar";
import { useVoice } from "@/hooks/useVoice";
import { WishlistButton } from "@/components/WishlistPanel";
import WishlistPanel from "@/components/WishlistPanel";

interface Session {
  id: string;
  title: string;
  messages: Message[];
}

const SUGGESTIONS = [
  { label: "Mathematics",            icon: "∑"  },
  { label: "Physics",                icon: "⚛"  },
  { label: "Computer Science",       icon: "💻" },
  { label: "English & Writing",      icon: "✍️" },
  { label: "Electrical Engineering", icon: "⚡" },
  { label: "Chemistry",              icon: "⚗️" },
  { label: "Political Science",      icon: "🏛️" },
  { label: "History",                icon: "📜" },
  { label: "Biology",                icon: "🧬" },
  { label: "Economics",              icon: "📈" },
  { label: "Business",               icon: "💼" },
  { label: "Philosophy",             icon: "🧠" },
  { label: "Aerospace Engineering",  icon: "🚀" },
  { label: "Environmental Science",  icon: "🌍" },
  { label: "Neuroscience",           icon: "🧠" },
  { label: "Mechanical Engineering", icon: "⚙️" },
  { label: "Artificial Intelligence",icon: "🤖" },
  { label: "Public Health",          icon: "🏥" },
  { label: "Psychology",             icon: "🪞" },
  { label: "Law",                    icon: "⚖️" },
  { label: "Civil Engineering",      icon: "🏗️" },
  { label: "Research Methods",       icon: "🔬" },
  { label: "Bioengineering",         icon: "🧪" },
  { label: "Data Science",           icon: "📊" },
  { label: "Cybersecurity",          icon: "🔐" },
];

function stripMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n+/g, " ")
    .trim();
}

export default function ChatPage() {
  const router = useRouter();
  const [sessions, setSessions]           = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [input, setInput]                 = useState("");
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [wishlistOpen, setWishlistOpen]   = useState(false);
  const [userName, setUserName]           = useState<string>("");
  const [gNumber, setGNumber]             = useState<string>("");
  const [activeBorrows, setActiveBorrows] = useState<number>(0);
  const [voiceMode, setVoiceMode]         = useState(false);
  const voiceModeRef      = useRef(false);
  const startListeningRef = useRef<(() => Promise<void>) | null>(null);
  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);

  function handleLogout() {
    localStorage.removeItem("lib_g_number");
    localStorage.removeItem("lib_user_name");
    router.push("/");
  }
  const bottomRef                         = useRef<HTMLDivElement>(null);
  const activeSessionIdRef                = useRef<string | undefined>(undefined);
  const textareaRef                       = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const name = localStorage.getItem("lib_user_name") ?? "";
    const g    = localStorage.getItem("lib_g_number")  ?? "";
    setUserName(name);
    setGNumber(g);
    if (g) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/members/${g}`)
        .then(r => r.json())
        .then(d => setActiveBorrows(d.active_borrows ?? 0))
        .catch(() => {});
    }
  }, []);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages      = activeSession?.messages ?? [];

  useEffect(() => { activeSessionIdRef.current = activeSessionId; }, [activeSessionId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + "px";
    }
  }, [input]);

  const handleSend = useCallback(async (text?: string) => {
    const query = (text ?? input).trim();
    if (!query) return;
    setInput("");
    setError(null);
    setLoading(true);

    const userMsg: Message = { role: "user", content: query };
    const currentSessionId = activeSessionIdRef.current;

    if (!currentSessionId) {
      setSessions((prev) => [{ id: "__pending__", title: query.slice(0, 40), messages: [userMsg] }, ...prev]);
      setActiveSessionId("__pending__");
    } else {
      setSessions((prev) => prev.map((s) => s.id === currentSessionId ? { ...s, messages: [...s.messages, userMsg] } : s));
    }

    try {
      const response = await sendChat({
        message: query,
        session_id: currentSessionId === "__pending__" ? undefined : currentSessionId,
      });
      const assistantMsg: Message = { role: "assistant", content: response.reply, books: response.books };
      setSessions((prev) => prev.map((s) => {
        if (s.id === "__pending__" || s.id === currentSessionId) {
          return { id: response.session_id, title: s.title, messages: [...s.messages.filter((m) => m !== userMsg), userMsg, assistantMsg] };
        }
        return s;
      }));
      setActiveSessionId(response.session_id);
      return response.reply;
    } catch {
      setError("Server is waking up — please try again in 30 seconds.");
      setSessions((prev) => prev.filter((s) => s.id !== "__pending__"));
      setActiveSessionId(undefined);
    } finally {
      setLoading(false);
    }
  }, [input]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (!q) return;
    window.history.replaceState({}, "", "/chat");
    const timer = setTimeout(() => handleSend(q), 450);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { status: voiceStatus, supported: voiceSupported, startListening, stopListening, speak, stopSpeaking } = useVoice({
    onTranscript: async (text) => {
      const reply = await handleSend(text);
      if (reply) speak(stripMarkdown(reply));
    },
    onSpeakEnd: () => {
      if (voiceModeRef.current) setTimeout(() => startListeningRef.current?.(), 400);
    },
  });

  useEffect(() => { startListeningRef.current = startListening; }, [startListening]);

  function toggleVoiceMode() {
    if (voiceModeRef.current) {
      voiceModeRef.current = false;
      setVoiceMode(false);
      stopListening();
      stopSpeaking();
    } else {
      voiceModeRef.current = true;
      setVoiceMode(true);
      startListening();
    }
  }

  function startNewSession() {
    voiceModeRef.current = false;
    setVoiceMode(false);
    stopSpeaking();
    setActiveSessionId(undefined);
    setInput("");
    setError(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }

  const isEmpty     = messages.length === 0;
  const isListening = voiceStatus === "listening";
  const isSpeaking  = voiceStatus === "speaking";
  const atLimit     = activeBorrows >= 3;

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: "#030c1a" }}>

      {/* ── LIBRARY BACKGROUND IMAGE ── */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "url('/backgrounds/library2.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: 0.18,
          zIndex: 0,
        }}
      />
      {/* Dark overlay so text stays readable */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "rgba(3,9,26,0.72)", zIndex: 1 }}
      />

      {wishlistOpen && <WishlistPanel onClose={() => setWishlistOpen(false)} />}

      <div className="relative flex-shrink-0" style={{ zIndex: 10 }}>
        <Sidebar
          sessions={sessions}
          activeId={activeSessionId}
          onSelect={(id) => { stopSpeaking(); setActiveSessionId(id); }}
          onNew={startNewSession}
        />
      </div>

      <div className="flex flex-col flex-1 min-w-0 relative" style={{ zIndex: 10 }}>

        {/* ── Top bar ── */}
        <header className="flex-shrink-0 h-12 flex items-center justify-between px-5"
          style={{ background: "#030d1e", borderBottom: "1px solid rgba(59,130,246,0.1)" }}>

          {/* LEFT — home button + name + borrow count */}
          <div className="flex items-center gap-2.5">
            <Link href="/"
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.11)"; e.currentTarget.style.color = "rgba(255,255,255,0.8)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "rgba(255,255,255,0.4)"; }}
              title="Back to Home">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </Link>
            {userName && (
              <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.75)" }}>
                {userName.split(" ")[0]}
              </span>
            )}
            {gNumber && (
              <div className="flex items-center gap-1.5 text-xs rounded-xl px-2.5 py-1"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(59,130,246,0.15)" }}>
                <span className="font-mono font-bold" style={{ color: "#60a5fa" }}>{gNumber}</span>
                <span style={{ color: "rgba(255,255,255,0.12)" }}>·</span>
                <span className="font-semibold" style={{ color: atLimit ? "#f87171" : "rgba(255,255,255,0.4)" }}>
                  {activeBorrows}/3
                </span>
              </div>
            )}
            {isSpeaking && (
              <button onClick={stopSpeaking}
                className="flex items-center gap-1.5 text-xs rounded-lg px-2.5 py-1 transition-colors"
                style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", color: "#60a5fa" }}>
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                Stop
              </button>
            )}
          </div>

          {/* RIGHT — Wishlist + Logout */}
          <div className="flex items-center gap-2">
            <WishlistButton onClick={() => setWishlistOpen(true)} />
            {gNumber && (
              <button
                onClick={handleLogout}
                title="Log out"
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all"
                style={{
                  background: "rgba(248,113,113,0.07)",
                  border: "1px solid rgba(248,113,113,0.15)",
                  color: "rgba(248,113,113,0.55)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(248,113,113,0.14)";
                  e.currentTarget.style.borderColor = "rgba(248,113,113,0.35)";
                  e.currentTarget.style.color = "#f87171";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(248,113,113,0.07)";
                  e.currentTarget.style.borderColor = "rgba(248,113,113,0.15)";
                  e.currentTarget.style.color = "rgba(248,113,113,0.55)";
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Log out
              </button>
            )}
          </div>
        </header>

        {/* ── Chat area ── */}
        <main className="flex-1 overflow-y-auto scrollbar-hide px-6 py-8">
          <div className="max-w-3xl mx-auto flex flex-col gap-7">

            {/* Empty state */}
            {isEmpty && (
              <div className="flex flex-col items-center gap-10 mt-10 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg,#7c3aed,#4338ca)", boxShadow: "0 0 40px rgba(124,58,237,0.35)" }}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                      </svg>
                    </div>
                    <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                      style={{ background: "#040310", borderColor: "rgba(255,255,255,0.1)" }}>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </span>
                  </div>
                  <div>
                    <h1 className="text-2xl font-black text-white">
                      {userName ? `Hey, ${userName.split(" ")[0]}! 👋` : "Hey there! 👋"}
                    </h1>
                    <p className="text-sm mt-1.5" style={{ color: "rgba(255,255,255,0.38)" }}>
                      Ask me anything — books, topics, shelf locations, recommendations.
                    </p>
                    {gNumber && (
                      <p className="text-xs mt-1.5 font-mono font-bold"
                        style={{ color: atLimit ? "#f87171" : "#a78bfa" }}>
                        {gNumber} · {activeBorrows}/3 books borrowed{atLimit ? " — limit reached" : ""}
                      </p>
                    )}
                  </div>
                </div>

                {/* Category chips */}
                <div className="flex flex-col items-center gap-3 w-full max-w-2xl">
                  <p className="text-[11px] font-bold tracking-widest uppercase"
                    style={{ color: "rgba(255,255,255,0.2)" }}>
                    Browse by subject
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button key={s.label} onClick={() => handleSend(`Books on ${s.label}`)}
                        className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-1.5 rounded-full transition-all active:scale-95"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,58,237,0.12)"; e.currentTarget.style.borderColor = "rgba(124,58,237,0.35)"; e.currentTarget.style.color = "#a78bfa"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "rgba(255,255,255,0.45)"; }}>
                        <span>{s.icon}</span>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#4338ca)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                  </svg>
                </div>
                <div className="flex gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#a78bfa", animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#a78bfa", animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#a78bfa", animationDelay: "300ms" }} />
                </div>
              </div>
            )}

            {error && (
              <div className="text-sm rounded-2xl px-4 py-3"
                style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#fca5a5" }}>
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </main>

        {/* ── Input bar ── */}
        <div className="flex-shrink-0 px-6 py-4"
          style={{ background: "#030d1e", borderTop: "1px solid rgba(59,130,246,0.1)" }}>

          {/* Listening indicator */}
          {isListening && (
            <div className="max-w-3xl mx-auto mb-3 flex items-center gap-2 text-sm">
              <span className="flex gap-0.5 items-end h-4">
                <span className="w-1 rounded-full animate-bounce" style={{ background: "#f87171", height: "60%", animationDelay: "0ms" }} />
                <span className="w-1 rounded-full animate-bounce" style={{ background: "#f87171", height: "100%", animationDelay: "100ms" }} />
                <span className="w-1 rounded-full animate-bounce" style={{ background: "#f87171", height: "70%", animationDelay: "200ms" }} />
                <span className="w-1 rounded-full animate-bounce" style={{ background: "#f87171", height: "90%", animationDelay: "300ms" }} />
              </span>
              <span className="font-medium" style={{ color: "#f87171" }}>Listening…</span>
              <button onClick={stopListening} className="ml-auto text-xs transition-colors"
                style={{ color: "rgba(255,255,255,0.3)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}>
                Cancel
              </button>
            </div>
          )}

          <div className="max-w-3xl mx-auto flex items-end gap-2">
            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about books, topics, or shelf locations…"
                rows={1}
                disabled={isListening}
                className="w-full resize-none rounded-2xl px-4 py-3 text-sm outline-none transition-all disabled:opacity-40"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "white",
                  caretColor: "#a78bfa",
                  minHeight: "48px",
                  maxHeight: "128px",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </div>

            {/* Voice agent button */}
            {voiceSupported && (
              <button
                onClick={toggleVoiceMode}
                disabled={loading}
                title={voiceMode ? "Stop voice mode" : "Start voice conversation"}
                className="flex items-center gap-1.5 px-3 h-11 rounded-2xl flex-shrink-0 transition-all disabled:opacity-30"
                style={isListening
                  ? { background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)", color: "#f87171" }
                  : isSpeaking
                  ? { background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.4)", color: "#a78bfa" }
                  : voiceMode
                  ? { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)", color: "#10b981" }
                  : { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
              >
                {isListening ? (
                  <span className="flex gap-0.5 items-end h-4">
                    {[60, 100, 70, 90, 55].map((h, i) => (
                      <span key={i} className="w-0.5 rounded-full animate-bounce bg-red-400"
                        style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }} />
                    ))}
                  </span>
                ) : isSpeaking ? (
                  <span className="flex gap-0.5 items-end h-4">
                    {[55, 90, 70, 100, 60].map((h, i) => (
                      <span key={i} className="w-0.5 rounded-full animate-bounce bg-violet-400"
                        style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }} />
                    ))}
                  </span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                    <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                  </svg>
                )}
                <span className="text-[11px] font-semibold hidden sm:block">
                  {isListening ? "Listening…" : isSpeaking ? "Speaking…" : voiceMode ? "Voice On" : "Voice"}
                </span>
              </button>
            )}

            {/* Send */}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading || isListening}
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4338ca)", boxShadow: input.trim() ? "0 0 20px rgba(124,58,237,0.35)" : "none" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>

          <p className="text-center text-[11px] mt-2" style={{ color: "rgba(255,255,255,0.18)" }}>
            Enter to send · Shift+Enter for new line · mic for voice
          </p>
        </div>
      </div>
    </div>
  );
}
