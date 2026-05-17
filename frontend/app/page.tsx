"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OnboardingModal from "@/components/OnboardingModal";
import QuickSearchModal from "@/components/QuickSearchModal";
import ReturnBooksModal from "@/components/ReturnBooksModal";

const BOOKS = [
  { id: "00b4ecbc", title: "Learning Perl",                cover: "/covers/01.jpg" },
  { id: "014a3e26", title: "Lincoln's Melancholy",          cover: "/covers/02.jpg" },
  { id: "10b8b5f6", title: "Abstract Algebra",              cover: "/covers/03.jpg" },
  { id: "286cc865", title: "Brief History of Computing",    cover: "/covers/04.jpg" },
  { id: "378c9641", title: "9-11",                          cover: "/covers/05.jpg" },
  { id: "3d8871f6", title: "Ten Days That Shook the World", cover: "/covers/06.jpg" },
  { id: "5c44a526", title: "On Liberty",                    cover: "/covers/07.jpg" },
  { id: "606d96ac", title: "Civil War",                     cover: "/covers/08.jpg" },
  { id: "660835de", title: "The Art of War",                cover: "/covers/09.jpg" },
  { id: "89363328", title: "A Life on Our Planet",          cover: "/covers/10.jpg" },
  { id: "9158ca1f", title: "Nicomachean Ethics",            cover: "/covers/11.jpg" },
  { id: "a5a78878", title: "Utopia",                        cover: "/covers/12.jpg" },
  { id: "b21940f6", title: "A Mind to Murder",              cover: "/covers/13.jpg" },
  { id: "e20aca11", title: "Stats with R",                  cover: "/covers/14.jpg" },
  { id: "e400f7aa", title: "Women & Economics",             cover: "/covers/15.jpg" },
  { id: "f410d3b6", title: "Animal Farm",                   cover: "/covers/16.jpg" },
  { id: "f72f8295", title: "Think Stats",                   cover: "/covers/17.jpg" },
  { id: "fd807350", title: "Nineteen Eighty-Four",          cover: "/covers/18.jpg" },
  { id: "fff5104d", title: "A Midsummer Night's Dream",     cover: "/covers/19.jpg" },
  { id: "0006a884", title: "Women and Economics",           cover: "/covers/20.jpg" },
];

const CAROUSEL = BOOKS.slice(0, 7);
const ROW1     = BOOKS.slice(0, 10);
const ROW2     = BOOKS.slice(10, 20);

const TECH_STACK = [
  { name: "Next.js 15",    color: "#e5e7eb" },
  { name: "FastAPI",       color: "#10b981" },
  { name: "PostgreSQL",    color: "#3b82f6" },
  { name: "pgvector",      color: "#a78bfa" },
  { name: "OpenAI GPT-4o", color: "#34d399" },
  { name: "Tailwind CSS",  color: "#22d3ee" },
];

const HOW_STEPS = [
  {
    color: "#a78bfa", rgb: "167,139,250", border: "rgba(167,139,250,0.2)",
    label: "Discover", title: "Ask in plain English",
    desc: "No keywords, no filters. Describe a mood, a genre, a topic — the AI understands natural language perfectly.",
    icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z",
  },
  {
    color: "#22d3ee", rgb: "34,211,238", border: "rgba(34,211,238,0.2)",
    label: "Locate", title: "Get the exact shelf",
    desc: "Floor · Section · Shelf code. Checked against live inventory. No account required — walk straight there.",
    icon: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z",
  },
  {
    color: "#f59e0b", rgb: "245,158,11", border: "rgba(245,158,11,0.2)",
    label: "Borrow", title: "Check out with G-Number",
    desc: "Sign in with your student G-Number. 3-book limit, 7-day loans — every borrow tracked automatically.",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
  },
];

const GENRES = ["Fiction", "History", "Science", "Philosophy", "Technology", "Economics"];

const STATS = [
  { target: 8000, suffix: "+", label: "Books Indexed", color: "#a78bfa", rgb: "167,139,250" },
  { target: 26,   suffix: "",  label: "Subjects",       color: "#22d3ee", rgb: "34,211,238"  },
  { target: 7,    suffix: "",  label: "Day Loans",      color: "#f59e0b", rgb: "245,158,11"  },
  { target: 3,    suffix: "",  label: "Book Limit",     color: "#34d399", rgb: "52,211,153"  },
];

export default function LandingPage() {
  const [modal, setModal]               = useState(false);
  const [quickSearch, setQuickSearch]   = useState(false);
  const [returnModal, setReturnModal]   = useState(false);
  const router = useRouter();

  const statsRef      = useRef<HTMLDivElement>(null);
  const [statsProgress, setStatsProgress] = useState(0);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const duration = 1600;
        const tick = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          setStatsProgress(1 - Math.pow(1 - t, 3));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const goToChat = useCallback(() => {
    const registered = typeof window !== "undefined" && !!localStorage.getItem("lib_g_number");
    if (registered) router.push("/chat");
    else setModal(true);
  }, [router]);

  return (
    <div className="min-h-screen text-white overflow-x-hidden"
      style={{ background: "#040410" }}>
      {modal && <OnboardingModal onClose={() => setModal(false)} />}
      {quickSearch && <QuickSearchModal onClose={() => setQuickSearch(false)} />}
      {returnModal && <ReturnBooksModal onClose={() => setReturnModal(false)} />}

      {/* ════════════════ NAV ════════════════ */}
      <nav className="fixed top-0 inset-x-0 z-40 h-14"
        style={{
          background: "rgba(4,4,16,0.88)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
        <div className="max-w-7xl mx-auto h-full px-5 lg:px-8 flex items-center justify-between gap-6">

          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4338ca)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white"
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <span className="text-sm font-bold tracking-tight">Library AI</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link href="#about"
              className="text-xs font-medium text-white/40 hover:text-white/80
                px-4 py-2 rounded-lg hover:bg-white/[0.05] transition-all">
              About
            </Link>
            <button onClick={() => setQuickSearch(true)}
              className="text-xs font-medium text-white/40 hover:text-white/80
                px-4 py-2 rounded-lg hover:bg-white/[0.05] transition-all">
              Quick Search
            </button>
            <button onClick={() => setReturnModal(true)}
              className="text-xs font-medium text-white/40 hover:text-white/80
                px-4 py-2 rounded-lg hover:bg-white/[0.05] transition-all">
              Return Books
            </button>
            <button onClick={goToChat}
              className="text-xs font-medium text-white/40 hover:text-white/80
                px-4 py-2 rounded-lg hover:bg-white/[0.05] transition-all">
              Start AI Chat
            </button>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <a href="https://github.com/satyaharsha" target="_blank" rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 text-xs text-white/35
                hover:text-white/65 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.04]">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </a>
            <button onClick={() => setModal(true)}
              className="text-xs font-semibold text-white px-4 py-2 rounded-xl transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg,#7c3aed,#4338ca)",
                boxShadow: "0 0 20px rgba(124,58,237,0.35)",
              }}>
              Get Access →
            </button>
          </div>
        </div>
      </nav>

      {/* ════════════════ HERO — centered arch ════════════════ */}
      <section className="relative overflow-hidden" style={{ height: "100vh", minHeight: 640 }}>

        {/* Background */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 120% 90% at 50% 60%, #120830 0%, #040410 58%)",
        }} />

        {/* Subtle grid texture */}
        <div className="absolute inset-0 opacity-[0.022] pointer-events-none" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.4) 1px,transparent 1px)",
          backgroundSize: "72px 72px",
        }} />

        {/* Books — centered arch */}
        <div className="absolute inset-0 flex items-center justify-center"
          style={{ perspective: "1100px", perspectiveOrigin: "50% 58%" }}>
          <div className="flex items-end justify-center">
            {CAROUSEL.map((book, i) => {
              const cfg = [
                { rotY: -26, ty: 88,  w: 172, h: 260, ml: 0   },
                { rotY: -14, ty: 44,  w: 194, h: 294, ml: -16 },
                { rotY:  -5, ty: 14,  w: 210, h: 318, ml: -16 },
                { rotY:   0, ty:   0, w: 226, h: 340, ml: -16 },
                { rotY:   5, ty: 14,  w: 210, h: 318, ml: -16 },
                { rotY:  14, ty: 44,  w: 194, h: 294, ml: -16 },
                { rotY:  26, ty: 88,  w: 172, h: 260, ml: -16 },
              ][i];
              return (
                <div key={book.id} className="flex-shrink-0 rounded-2xl overflow-hidden"
                  style={{
                    width: cfg.w, height: cfg.h,
                    transform: `rotateY(${cfg.rotY}deg) translateY(${cfg.ty}px)`,
                    transformStyle: "preserve-3d",
                    marginLeft: cfg.ml,
                    zIndex: 4 - Math.abs(i - 3),
                    boxShadow: "0 30px 80px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.06)",
                  }}>
                  <Image src={book.cover} alt={book.title} width={240} height={360}
                    className="w-full h-full object-cover" priority unoptimized />
                </div>
              );
            })}
          </div>
        </div>

        {/* Overlay: vignette + top/bottom fade */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: [
            "radial-gradient(ellipse 80% 70% at 50% 50%,rgba(4,4,16,0.68) 0%,rgba(4,4,16,0.86) 60%,#040410 100%)",
            "linear-gradient(to bottom,#040410 0%,rgba(4,4,16,0.52) 20%,rgba(4,4,16,0.18) 50%,rgba(4,4,16,0.58) 80%,#040410 100%)",
          ].join(","),
        }} />

        {/* Violet ambient glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 55%,rgba(124,58,237,0.1) 0%,transparent 70%)",
        }} />

        {/* Floating genre chips */}
        {[
          { label: "Fiction",     top: "16%", left: "12%"  },
          { label: "History",     top: "20%", right: "11%" },
          { label: "Science",     top: "62%", left: "8%"   },
          { label: "Philosophy",  top: "68%", right: "9%"  },
          { label: "Technology",  top: "38%", left: "4%"   },
          { label: "Economics",   top: "40%", right: "4%"  },
        ].map((chip) => (
          <div key={chip.label} className="absolute pointer-events-none hidden lg:block"
            style={{ top: chip.top, left: (chip as any).left, right: (chip as any).right }}>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(255,255,255,0.035)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "rgba(255,255,255,0.28)",
              }}>
              {chip.label}
            </span>
          </div>
        ))}

        {/* Centered content */}
        <div className="absolute inset-0 z-10 pt-14 flex flex-col items-center justify-center
          px-5 text-center gap-4">

          {/* Eyebrow */}
          <div className="inline-flex items-center gap-3">
            <span className="h-px w-8" style={{ background: "rgba(167,139,250,0.5)" }} />
            <span className="text-[11px] font-bold tracking-[0.28em] uppercase"
              style={{ color: "#a78bfa" }}>
              AI-Powered Library
            </span>
            <span className="h-px w-8" style={{ background: "rgba(167,139,250,0.5)" }} />
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-[76px] font-black tracking-tight leading-none"
            style={{ textShadow: "0 4px 40px rgba(0,0,0,0.9)" }}>
            Find your next great{" "}
            <span style={{
              background: "linear-gradient(95deg,#f59e0b 0%,#fbbf24 50%,#f97316 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>read.</span>
          </h1>

          {/* Sub */}
          <p className="text-base lg:text-lg max-w-md leading-relaxed"
            style={{ color: "rgba(255,255,255,0.46)", textShadow: "0 2px 20px rgba(0,0,0,0.9)" }}>
            Ask anything in natural language — our AI checks real library inventory
            and tells you exactly where to find it on the shelf.
          </p>

          {/* CTAs — 2 buttons only */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-2">
            {/* Start AI Chat */}
            <button onClick={goToChat}
              className="flex items-center gap-2.5 text-sm font-bold text-white
                px-7 py-3.5 rounded-2xl transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg,#7c3aed 0%,#4338ca 100%)",
                boxShadow: "0 0 36px rgba(124,58,237,0.5), inset 0 1px 0 rgba(255,255,255,0.14)",
              }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
              </svg>
              Start AI Chat
            </button>

            {/* Return Books */}
            <button onClick={() => setReturnModal(true)}
              className="flex items-center gap-2.5 text-sm font-semibold transition-all active:scale-95 px-6 py-3.5 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.6)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(167,139,250,0.45)"; e.currentTarget.style.color = "#a78bfa"; e.currentTarget.style.background = "rgba(124,58,237,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.6)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
                viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              Return Books
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-10 mt-3 pt-6"
            style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            {[
              { n: "8,000+", l: "Books indexed", c: "#a78bfa" },
              { n: "3",      l: "Borrow limit",  c: "#22d3ee" },
              { n: "7 days", l: "Loan period",   c: "#f59e0b" },
            ].map(({ n, l, c }) => (
              <div key={l} className="flex flex-col items-center gap-0.5">
                <span className="text-2xl font-black" style={{ color: c }}>{n}</span>
                <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.28)" }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ TRUST STRIP ════════════════ */}
      <div style={{
        background: "rgba(255,255,255,0.015)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center justify-center gap-x-10 gap-y-2">
          {[
            { d: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z", t: "No login needed to search" },
            { d: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z", t: "Real-time shelf locations" },
            { d: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z", t: "Natural language AI search" },
            { d: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253", t: "Student G-Number borrowing" },
          ].map(({ d, t }) => (
            <div key={t} className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 flex-shrink-0"
                style={{ color: "#7c3aed" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d}/>
              </svg>
              <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.33)" }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════ STATS ════════════════ */}
      <section ref={statsRef} style={{ background: "linear-gradient(180deg,#040410 0%,#07031a 50%,#040410 100%)" }}>
        <div className="max-w-5xl mx-auto px-6 py-20 grid grid-cols-2 md:grid-cols-4 gap-10">
          {STATS.map(({ target, suffix, label, color, rgb }) => {
            const n = Math.round(statsProgress * target);
            const display = target >= 1000 ? n.toLocaleString() : String(n);
            return (
              <div key={label} className="flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1"
                  style={{ background: `rgba(${rgb},0.08)`, border: `1px solid rgba(${rgb},0.18)` }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                </div>
                <span className="text-4xl lg:text-5xl font-black tabular-nums" style={{ color }}>
                  {display}{suffix}
                </span>
                <span className="text-xs font-semibold tracking-widest uppercase"
                  style={{ color: "rgba(255,255,255,0.28)" }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ════════════════ COLLECTION ════════════════ */}
      <section style={{
        background: "linear-gradient(180deg,#040410 0%,#0a0620 40%,#040410 100%)",
        padding: "80px 0 88px",
      }}>
        <div className="text-center mb-14 px-6">
          <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5"
            style={{ background: "rgba(34,211,238,0.07)", border: "1px solid rgba(34,211,238,0.15)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest uppercase"
              style={{ color: "#22d3ee" }}>The Collection</span>
          </div>
          <h2 className="text-3xl lg:text-5xl font-black text-white mb-4 leading-tight">
            8,000+ titles.{" "}
            <span style={{
              background: "linear-gradient(90deg,#22d3ee,#a78bfa)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>All searchable.</span>
          </h2>
          <p className="text-sm max-w-sm mx-auto" style={{ color: "rgba(255,255,255,0.3)" }}>
            Fiction · non-fiction · academic · research — every genre, findable in seconds.
          </p>
        </div>

        <div className="relative mb-4" style={{ overflow: "hidden" }}>
          <div className="absolute inset-y-0 left-0 w-40 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to right,#040410,transparent)" }} />
          <div className="absolute inset-y-0 right-0 w-40 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to left,#040410,transparent)" }} />
          <div className="marquee-left flex" style={{ gap: 12 }}>
            {[...ROW1, ...ROW1].map((b, i) => (
              <div key={`r1-${i}`} className="flex-shrink-0 group relative cursor-pointer"
                style={{ width: 136, height: 204 }}>
                <div className="w-full h-full rounded-2xl overflow-hidden transition-all
                  duration-300 group-hover:scale-105 group-hover:-translate-y-2"
                  style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07)" }}>
                  <Image src={b.cover} alt={b.title} width={136} height={204}
                    className="w-full h-full object-cover" unoptimized />
                  <div className="absolute inset-0 rounded-2xl flex items-end p-3
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: "linear-gradient(to top,rgba(0,0,0,0.88) 0%,transparent 55%)" }}>
                    <p className="text-white text-[10px] font-semibold leading-tight line-clamp-2">{b.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative" style={{ overflow: "hidden" }}>
          <div className="absolute inset-y-0 left-0 w-40 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to right,#040410,transparent)" }} />
          <div className="absolute inset-y-0 right-0 w-40 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to left,#040410,transparent)" }} />
          <div className="marquee-right flex" style={{ gap: 12 }}>
            {[...ROW2, ...ROW2].map((b, i) => (
              <div key={`r2-${i}`} className="flex-shrink-0 group relative cursor-pointer"
                style={{ width: 108, height: 162 }}>
                <div className="w-full h-full rounded-xl overflow-hidden transition-all
                  duration-300 group-hover:scale-105 group-hover:-translate-y-2"
                  style={{ boxShadow: "0 8px 28px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06)" }}>
                  <Image src={b.cover} alt={b.title} width={108} height={162}
                    className="w-full h-full object-cover" unoptimized />
                  <div className="absolute inset-0 rounded-xl flex items-end p-2
                    opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    style={{ background: "linear-gradient(to top,rgba(0,0,0,0.88) 0%,transparent 60%)" }}>
                    <p className="text-white text-[9px] font-semibold leading-tight line-clamp-2">{b.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2.5 mt-12 px-6">
          {GENRES.map((g) => (
            <button key={g} onClick={goToChat}
              className="text-xs font-semibold px-4 py-2 rounded-full transition-all
                hover:scale-105 active:scale-95"
              style={{
                background: "rgba(255,255,255,0.035)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.42)",
              }}>
              {g}
            </button>
          ))}
          <button onClick={goToChat}
            className="text-xs font-bold px-4 py-2 rounded-full transition-all hover:scale-105"
            style={{
              background: "rgba(124,58,237,0.12)",
              border: "1px solid rgba(124,58,237,0.3)",
              color: "#a78bfa",
            }}>
            + Ask AI for more →
          </button>
        </div>
      </section>

      {/* ════════════════ HOW IT WORKS ════════════════ */}
      <section className="relative py-28 overflow-hidden"
        style={{ background: "linear-gradient(180deg,#040410 0%,#07031a 50%,#040410 100%)" }}>

        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.018) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
        }} />

        <div className="max-w-6xl mx-auto px-6 lg:px-10 relative">

          {/* Header */}
          <div className="flex flex-col items-center text-center mb-16 gap-3">
            <div className="inline-flex items-center gap-3">
              <span className="h-px w-10" style={{ background: "rgba(167,139,250,0.28)" }} />
              <span className="text-[11px] font-bold tracking-[0.3em] uppercase"
                style={{ color: "#a78bfa" }}>How it works</span>
              <span className="h-px w-10" style={{ background: "rgba(167,139,250,0.28)" }} />
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight">
              Ask.{" "}
              <span style={{ color: "#22d3ee" }}>Find.</span>{" "}
              <span style={{ color: "#f59e0b" }}>Borrow.</span>
            </h2>
            <p className="text-base max-w-sm" style={{ color: "rgba(255,255,255,0.32)" }}>
              Three steps. No friction. Any book, any time.
            </p>
          </div>

          {/* ── Architecture pipeline ── */}
          <div className="relative">

            {/* Pipeline flow: cards + connectors */}
            <div className="flex flex-col md:flex-row items-stretch">
              {HOW_STEPS.map((step, i) => (
                <div key={i} className="flex flex-col md:flex-row items-center flex-1 min-w-0">

                  {/* ── Step card ── */}
                  <div className="w-full rounded-2xl px-6 py-7 flex flex-col gap-4
                    transition-all duration-300 hover:-translate-y-1"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}>

                    {/* Step label + icon */}
                    <div className="flex items-center gap-2.5">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0"
                        style={{ color: step.color }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={step.icon}/>
                      </svg>
                      <span className="text-[10px] font-bold tracking-[0.24em] uppercase"
                        style={{ color: step.color }}>
                        {String(i + 1).padStart(2, "0")} · {step.label}
                      </span>
                    </div>

                    {/* Title + description */}
                    <div className="flex flex-col gap-2">
                      <h3 className="text-base font-bold text-white leading-snug">{step.title}</h3>
                      <p className="text-sm leading-[1.8]" style={{ color: "rgba(255,255,255,0.34)" }}>
                        {step.desc}
                      </p>
                    </div>
                  </div>

                  {/* ── Horizontal connector (desktop) ── */}
                  {i < HOW_STEPS.length - 1 && (
                    <div className="hidden md:flex items-center justify-center w-16 flex-shrink-0 relative" style={{ height: 2 }}>
                      {/* Gradient line */}
                      <div className="absolute inset-0 top-1/2 -translate-y-1/2"
                        style={{
                          height: 1,
                          background: `linear-gradient(90deg,rgba(${step.rgb},0.5),rgba(${HOW_STEPS[i + 1].rgb},0.5))`,
                        }} />
                      {/* Animated travel dot */}
                      <div className="flow-dot w-2.5 h-2.5 rounded-full"
                        style={{
                          background: step.color,
                          boxShadow: `0 0 10px ${step.color}, 0 0 20px ${step.color}60`,
                          animationDelay: `${i * 0.65}s`,
                        }} />
                      {/* Arrowhead */}
                      <div className="absolute right-0 w-0 h-0"
                        style={{
                          borderTop: "5px solid transparent",
                          borderBottom: "5px solid transparent",
                          borderLeft: `8px solid rgba(${HOW_STEPS[i + 1].rgb},0.55)`,
                        }} />
                    </div>
                  )}

                  {/* ── Vertical connector (mobile) ── */}
                  {i < HOW_STEPS.length - 1 && (
                    <div className="md:hidden flex flex-col items-center py-4 gap-0.5">
                      <div className="w-px h-5"
                        style={{ background: `linear-gradient(180deg,rgba(${step.rgb},0.4),rgba(${HOW_STEPS[i + 1].rgb},0.4))` }} />
                      <div className="w-0 h-0"
                        style={{
                          borderLeft: "5px solid transparent",
                          borderRight: "5px solid transparent",
                          borderTop: `7px solid rgba(${HOW_STEPS[i + 1].rgb},0.45)`,
                        }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── Infrastructure bar ── */}
            <div className="mt-5 rounded-2xl px-6 py-3.5 flex flex-wrap items-center gap-x-5 gap-y-2"
              style={{
                background: "rgba(255,255,255,0.015)",
                border: "1px solid rgba(255,255,255,0.055)",
              }}>
              <span className="text-[9px] font-bold tracking-[0.28em] uppercase flex-shrink-0"
                style={{ color: "rgba(255,255,255,0.18)" }}>System</span>
              <div className="hidden sm:block w-px h-3" style={{ background: "rgba(255,255,255,0.08)" }} />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 flex-1">
                {[
                  { name: "FastAPI",       color: "#10b981" },
                  { name: "PostgreSQL",    color: "#3b82f6" },
                  { name: "pgvector",      color: "#a78bfa" },
                  { name: "OpenAI GPT-4o", color: "#34d399" },
                  { name: "Next.js 15",    color: "#e5e7eb" },
                ].map((tech) => (
                  <div key={tech.name} className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: tech.color, boxShadow: `0 0 6px ${tech.color}70` }} />
                    <span className="text-[10px] font-medium"
                      style={{ color: "rgba(255,255,255,0.28)" }}>{tech.name}</span>
                  </div>
                ))}
              </div>
              <button onClick={goToChat}
                className="text-[11px] font-semibold flex items-center gap-1 transition-colors flex-shrink-0"
                style={{ color: "rgba(255,255,255,0.28)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.65)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}>
                Try it now →
              </button>
            </div>
          </div>

          {/* CTA */}
          <div className="flex justify-center mt-14">
            <button onClick={() => setModal(true)}
              className="group flex items-center gap-3 text-white font-bold
                px-10 py-4 rounded-2xl text-sm transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg,#7c3aed,#4338ca)",
                boxShadow: "0 0 48px rgba(124,58,237,0.28), inset 0 1px 0 rgba(255,255,255,0.12)",
              }}>
              Register with Student ID
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                className="w-4 h-4 group-hover:translate-x-1 transition-transform">
                <path fillRule="evenodd"
                  d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z"
                  clipRule="evenodd"/>
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ════════════════ ABOUT ════════════════ */}
      <section id="about" className="relative py-24 px-6 lg:px-10 overflow-hidden"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: "#030309" }}>

        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.028) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }} />

        <div className="max-w-5xl mx-auto relative">
          <div className="grid md:grid-cols-2 gap-16 items-start">

            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-4">
                <div className="inline-flex items-center gap-2 w-fit">
                  <span className="h-px w-6" style={{ background: "#a78bfa" }} />
                  <p className="text-[11px] font-bold tracking-[0.3em] uppercase"
                    style={{ color: "#a78bfa" }}>About</p>
                </div>
                <h2 className="text-3xl lg:text-4xl font-black text-white leading-tight">
                  Built for students.
                  <br />
                  <span style={{ color: "rgba(255,255,255,0.2)" }}>Powered by AI.</span>
                </h2>
                <p className="text-sm leading-[1.9]" style={{ color: "rgba(255,255,255,0.38)" }}>
                  An open-source AI library assistant with semantic vector search.
                  Every recommendation is grounded in live inventory — so you never
                  walk to a shelf only to find the book already gone.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.18)" }}>
                  Designed &amp; built by Satya Harsha Sappa
                </p>
                <a href="https://github.com/satyaharsha" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold
                    text-white/32 hover:text-white/72 transition-colors w-fit">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                  View on GitHub →
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <p className="text-[10px] font-bold tracking-[0.28em] uppercase"
                style={{ color: "rgba(255,255,255,0.15)" }}>Built with</p>
              <div className="grid grid-cols-2 gap-2.5">
                {TECH_STACK.map((item) => (
                  <div key={item.name}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all
                      hover:bg-white/[0.035]"
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: item.color, boxShadow: `0 0 8px ${item.color}70` }} />
                    <span className="text-sm font-medium"
                      style={{ color: "rgba(255,255,255,0.48)" }}>{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ FOOTER ════════════════ */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: "#020208" }}>
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row
          items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4338ca)" }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white"
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.52)" }}>Library AI</p>
              <p className="text-[11px] mt-px" style={{ color: "rgba(255,255,255,0.16)" }}>
                AI-Powered Library Assistant
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6 text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
            <a href="https://github.com/satyaharsha" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-white/50 transition-colors">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              GitHub
            </a>
            <span>MIT License</span>
            <span>© 2025 Satya Harsha Sappa</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
