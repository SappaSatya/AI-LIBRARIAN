"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { locateBook } from "@/lib/api";

type Copy = {
  copy_number: number;
  status: string;
  location: string;
  due_date?: string;
};

type LocateResult = {
  id: string;
  title: string;
  copies: Copy[];
};

export default function QuickSearchModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<LocateResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); setSearched(false); setLoading(false); return; }
    setLoading(true);
    setSearched(false);
    const timer = setTimeout(async () => {
      try {
        const data = await locateBook(q);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const hasQuery  = query.trim().length > 0;
  const noResults = searched && !loading && results.length === 0;

  const SUGGESTIONS = [
    { label: "Machine Learning",    color: "rgba(34,211,238,0.8)",  border: "rgba(34,211,238,0.2)",  bg: "rgba(34,211,238,0.06)"  },
    { label: "Python Programming",  color: "rgba(34,211,238,0.8)",  border: "rgba(34,211,238,0.2)",  bg: "rgba(34,211,238,0.06)"  },
    { label: "Climate Change",      color: "rgba(52,211,153,0.8)",  border: "rgba(52,211,153,0.2)",  bg: "rgba(52,211,153,0.06)"  },
    { label: "Economics",           color: "rgba(52,211,153,0.8)",  border: "rgba(52,211,153,0.2)",  bg: "rgba(52,211,153,0.06)"  },
    { label: "Calculus",            color: "rgba(167,139,250,0.8)", border: "rgba(167,139,250,0.2)", bg: "rgba(167,139,250,0.06)" },
    { label: "The Art of War",      color: "rgba(251,191,36,0.8)",  border: "rgba(251,191,36,0.2)",  bg: "rgba(251,191,36,0.06)"  },
    { label: "Artificial Intelligence", color: "rgba(34,211,238,0.8)", border: "rgba(34,211,238,0.2)", bg: "rgba(34,211,238,0.06)" },
    { label: "Cybersecurity",       color: "rgba(167,139,250,0.8)", border: "rgba(167,139,250,0.2)", bg: "rgba(167,139,250,0.06)" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4"
      style={{ paddingTop: "10vh", background: "rgba(4,4,16,0.72)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{
          background: "rgba(10,6,26,0.96)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), 0 0 60px rgba(124,58,237,0.06)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Search bar ── */}
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          {/* Icon / loader */}
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
            {loading ? (
              <span className="flex gap-0.5 items-end h-4">
                <span className="w-1 bg-violet-400 rounded-full animate-bounce" style={{ height: "55%", animationDelay: "0ms" }} />
                <span className="w-1 bg-violet-400 rounded-full animate-bounce" style={{ height: "100%", animationDelay: "110ms" }} />
                <span className="w-1 bg-violet-400 rounded-full animate-bounce" style={{ height: "65%", animationDelay: "220ms" }} />
              </span>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" style={{ color: "rgba(255,255,255,0.28)" }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
              </svg>
            )}
          </div>

          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a book title to find it on the shelf..."
            className="flex-1 bg-transparent text-white text-[15px] outline-none placeholder-white/20"
            style={{ caretColor: "#a78bfa" }}
          />

          {hasQuery && (
            <button
              onClick={() => setQuery("")}
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" style={{ color: "rgba(255,255,255,0.4)" }}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          )}

          <button
            onClick={onClose}
            className="hidden sm:flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors hover:bg-white/[0.06]"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.25)",
            }}
          >
            ESC
          </button>
        </div>

        {/* ── Body ── */}
        <div className="max-h-[58vh] overflow-y-auto scrollbar-hide">

          {/* Initial prompt + suggestion chips */}
          {!hasQuery && (
            <div className="flex flex-col items-center gap-5 py-10 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.18)" }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" style={{ color: "#a78bfa" }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.4}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.38)" }}>
                  Find any book and see exactly where it is on the shelf
                </p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.16)" }}>
                  No login required · Floor · Section · Shelf code
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setQuery(s.label)}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-full transition-all hover:scale-105 active:scale-95"
                    style={{ color: s.color, border: `1px solid ${s.border}`, background: s.bg }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Skeleton while loading */}
          {hasQuery && loading && (
            <div className="py-2">
              {[0, 1].map((i) => (
                <div key={i} className="px-5 py-4"
                  style={{ borderBottom: i === 0 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="h-3.5 rounded animate-pulse w-2/3"
                      style={{ background: "rgba(255,255,255,0.08)" }} />
                    <div className="h-5 w-20 rounded-full animate-pulse flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.06)" }} />
                  </div>
                  <div className="flex gap-2">
                    {[0, 1, 2].map((j) => (
                      <div key={j} className="h-7 rounded-xl animate-pulse"
                        style={{ width: j === 0 ? 120 : j === 1 ? 100 : 90, background: "rgba(255,255,255,0.05)" }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="py-2">
              {results.map((book, bi) => {
                const available = book.copies.filter((c) => c.status === "available");
                return (
                  <div key={book.id}
                    className="px-5 py-4 transition-colors"
                    style={{ borderBottom: bi < results.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Book title + status badge */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <p className="text-sm font-semibold text-white leading-snug">{book.title}</p>
                      <span
                        className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full"
                        style={available.length > 0
                          ? { background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.22)", color: "#10b981" }
                          : { background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.22)", color: "#f59e0b" }
                        }
                      >
                        {available.length > 0 ? `${available.length} available` : "None available"}
                      </span>
                    </div>

                    {/* Copy chips */}
                    <div className="flex flex-wrap gap-2">
                      {book.copies.map((copy) => {
                        const isAvail = copy.status === "available";
                        const dotColor = isAvail ? "#10b981" : copy.status === "reserved" ? "#f59e0b" : "#4b5563";
                        const label = copy.status === "checked_out" ? "checked out"
                          : copy.status === "reserved" ? "reserved" : copy.status;
                        return (
                          <div
                            key={copy.copy_number}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                            style={{
                              background: isAvail ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.025)",
                              border: isAvail ? "1px solid rgba(16,185,129,0.16)" : "1px solid rgba(255,255,255,0.06)",
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ background: dotColor }} />
                            <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>
                              {copy.location}
                            </span>
                            <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.22)" }}>
                              · Copy {copy.copy_number}
                            </span>
                            {!isAvail && (
                              <span className="text-[10px] font-medium" style={{ color: dotColor }}>
                                · {label}{copy.due_date ? ` · due ${copy.due_date}` : ""}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* No results */}
          {noResults && (
            <div className="flex flex-col items-center gap-6 py-12 px-6 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.16)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" style={{ color: "#f59e0b" }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
                  </svg>
                </div>
                <p className="text-sm font-semibold text-white">
                  No book found for &ldquo;{query.trim()}&rdquo;
                </p>
                <p className="text-xs max-w-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
                  That title isn&apos;t in our collection. The AI chat can help — it understands descriptions, topics, and genres too.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs">
                <Link
                  href={`/chat?q=${encodeURIComponent(query.trim())}`}
                  onClick={onClose}
                  className="flex items-center justify-center gap-2.5 w-full sm:flex-1 text-sm font-bold
                    text-white px-5 py-3 rounded-xl transition-all active:scale-95"
                  style={{
                    background: "linear-gradient(135deg,#7c3aed,#4338ca)",
                    boxShadow: "0 0 24px rgba(124,58,237,0.28)",
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  Ask AI Chat
                </Link>

                <Link
                  href="/chat"
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 w-full sm:flex-1 text-sm font-semibold
                    px-5 py-3 rounded-xl transition-all active:scale-95"
                  style={{
                    background: "rgba(124,58,237,0.1)",
                    border: "1px solid rgba(124,58,237,0.25)",
                    color: "#a78bfa",
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                  </svg>
                  Browse AI Chat
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {results.length > 0 && (
          <div
            className="px-5 py-3 flex items-center justify-between"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.18)" }}>
              {results.length} book{results.length !== 1 ? "s" : ""} found
            </p>
            <Link
              href={`/chat?q=${encodeURIComponent(query.trim())}`}
              onClick={onClose}
              className="text-[11px] font-medium transition-colors"
              style={{ color: "rgba(167,139,250,0.45)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(167,139,250,0.85)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(167,139,250,0.45)")}
            >
              Ask AI for more context →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
