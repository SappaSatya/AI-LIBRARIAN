"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const BOOK_COVERS = [
  { cover: "/covers/18.jpg", title: "Nineteen Eighty-Four" },
  { cover: "/covers/16.jpg", title: "Animal Farm" },
  { cover: "/covers/09.jpg", title: "The Art of War" },
  { cover: "/covers/12.jpg", title: "Utopia" },
  { cover: "/covers/10.jpg", title: "A Life on Our Planet" },
  { cover: "/covers/01.jpg", title: "Learning Perl" },
  { cover: "/covers/06.jpg", title: "Ten Days That Shook the World" },
];

// Each book is a parallelogram stacked like the staircase screenshot.
// STEP  = how far down each book starts (100vh / 7)
// TILT  = how many vh the right edge drops relative to the left edge
const BOOKS = BOOK_COVERS.length;   // 7
const STEP  = 100 / BOOKS;          // ~14.28 vh per book
const TILT  = 4;                    // vh — right side is 4 vh lower than left side

type BorrowRecord = { title: string; cover_url?: string; due_date: string | null };

interface SidebarProps {
  sessions: { id: string; title: string }[];
  activeId: string | undefined;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export default function Sidebar(_props: SidebarProps) {
  const [borrows, setBorrows] = useState<BorrowRecord[]>([]);
  const [gNumber, setGNumber] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const g = localStorage.getItem("lib_g_number") ?? "";
    setGNumber(g);
    if (!g) return;
    setLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/members/${g}/borrows`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d) => setBorrows(Array.isArray(d.borrows) ? d.borrows : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <aside
      className="flex-shrink-0 relative h-full overflow-hidden"
      style={{
        width: 172,
        background: "#020915",
        borderRight: "1px solid rgba(59,130,246,0.18)",
      }}
    >
      {/* ── BACKGROUND: staircase parallelogram book stack ── */}
      {BOOK_COVERS.map((book, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: `calc(${i * STEP}vh + 2px)`,
            left: 0,
            right: 0,
            /* height extends by TILT so the diagonal right edge reaches the next book */
            height: `calc(${STEP + TILT}vh - 3px)`,
            /* parallelogram: left edge is straight, right side drops by TILT vh */
            clipPath: `polygon(0 0, 100% ${TILT}vh, 100% 100%, 0 calc(100% - ${TILT}vh))`,
            zIndex: BOOKS - i,
            overflow: "hidden",
          }}
        >
          {/* Actual book cover image */}
          <Image
            src={book.cover}
            alt={book.title}
            fill
            className="object-cover"
            unoptimized
            style={{ opacity: 0.78 }}
          />
          {/* Blue-navy tint so it matches the dark theme */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(6,20,60,0.28)",
            }}
          />
          {/* Top-edge shadow — simulates the book's thickness/spine */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 6,
              background: "rgba(1,5,18,0.75)",
            }}
          />
          {/* Subtle right-edge shadow for depth */}
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: 10,
              background:
                "linear-gradient(to left, rgba(1,5,18,0.45), transparent)",
            }}
          />
        </div>
      ))}

      {/* ── FOREGROUND OVERLAY: semi-transparent dark wash ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "rgba(2,9,21,0.54)", zIndex: 10 }}
      />

      {/* ── FOREGROUND: history panel ── */}
      <div
        className="relative flex flex-col h-full"
        style={{ zIndex: 11 }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 px-3.5 pt-3.5 pb-2.5"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "#7c3aed" }}
            />
            <p
              className="text-[9px] font-bold uppercase tracking-[0.2em]"
              style={{ color: "rgba(255,255,255,0.45)" }}
            >
              My Books
            </p>
          </div>
        </div>

        {/* Borrow list */}
        <div className="flex-1 overflow-y-auto scrollbar-hide py-1">
          {loading ? (
            <ul className="flex flex-col">
              {[0, 1, 2].map((i) => (
                <li key={i} className="px-3 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-10 rounded-md flex-shrink-0 animate-pulse"
                      style={{ background: "rgba(255,255,255,0.08)" }} />
                    <div className="flex-1 flex flex-col gap-1.5 pt-1">
                      <div className="h-2.5 rounded animate-pulse w-full"
                        style={{ background: "rgba(255,255,255,0.08)" }} />
                      <div className="h-2.5 rounded animate-pulse w-4/5"
                        style={{ background: "rgba(255,255,255,0.08)" }} />
                      <div className="h-2 rounded animate-pulse w-1/2 mt-0.5"
                        style={{ background: "rgba(255,255,255,0.05)" }} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : borrows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 px-4 text-center">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{
                  background: "rgba(124,58,237,0.13)",
                  border: "1px solid rgba(124,58,237,0.22)",
                  backdropFilter: "blur(4px)",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  style={{ color: "#a78bfa" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <p
                className="text-[10px] leading-relaxed font-medium"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                {gNumber ? "No books borrowed yet" : "Login to see your books"}
              </p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {borrows.map((b, i) => {
                const overdue = b.due_date
                  ? new Date(b.due_date) < new Date()
                  : false;
                return (
                  <li
                    key={i}
                    className="px-3 py-3"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-7 h-10 rounded-md flex-shrink-0 overflow-hidden"
                        style={{
                          boxShadow: "0 3px 10px rgba(0,0,0,0.6)",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }}
                      >
                        {b.cover_url ? (
                          <Image
                            src={b.cover_url}
                            alt={b.title}
                            width={28}
                            height={40}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div
                            className="w-full h-full"
                            style={{
                              background:
                                "linear-gradient(135deg,#1e1b4b,#312e81)",
                            }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-white line-clamp-2 leading-snug">
                          {b.title}
                        </p>
                        {b.due_date && (
                          <div className="flex items-center gap-1 mt-1">
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{
                                background: overdue ? "#f87171" : "#10b981",
                              }}
                            />
                            <span
                              className="text-[9px] font-medium"
                              style={{
                                color: overdue
                                  ? "#f87171"
                                  : "rgba(16,185,129,0.85)",
                              }}
                            >
                              {overdue ? "Overdue" : `Due ${b.due_date}`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex-shrink-0 px-3.5 py-2.5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p className="text-[9px]" style={{ color: "rgba(255,255,255,0.18)" }}>
            {borrows.length}/3 borrowed
          </p>
        </div>
      </div>
    </aside>
  );
}
