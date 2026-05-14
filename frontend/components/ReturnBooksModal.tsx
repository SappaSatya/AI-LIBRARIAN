"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { returnBook } from "@/lib/api";

type BorrowRecord = {
  inventory_id: string;
  book_id: string;
  title: string;
  cover_url?: string;
  due_date: string | null;
};

type ReturnState = "idle" | "loading" | "done" | "error";

export default function ReturnBooksModal({ onClose }: { onClose: () => void }) {
  const [step, setStep]         = useState<"id" | "list">("id");
  const [gInput, setGInput]     = useState("");
  const [gNumber, setGNumber]   = useState("");
  const [borrows, setBorrows]   = useState<BorrowRecord[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchErr, setFetchErr] = useState("");
  const [returns, setReturns]   = useState<Record<string, ReturnState>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Pre-fill from localStorage if available
    const saved = localStorage.getItem("lib_g_number") ?? "";
    if (saved) setGInput(saved);
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function fetchBorrows(g: string) {
    setFetching(true);
    setFetchErr("");
    try {
      const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
      const res = await fetch(`${API}/members/${g.trim().toUpperCase()}/borrows`);
      if (!res.ok) {
        setFetchErr("Student ID not found. Please check and try again.");
        setFetching(false);
        return;
      }
      const data = await res.json();
      const list: BorrowRecord[] = Array.isArray(data.borrows) ? data.borrows : [];
      setBorrows(list);
      setGNumber(g.trim().toUpperCase());
      setStep("list");
    } catch {
      setFetchErr("Could not reach the server. Is the backend running?");
    } finally {
      setFetching(false);
    }
  }

  async function handleReturn(b: BorrowRecord) {
    setReturns((p) => ({ ...p, [b.book_id]: "loading" }));
    try {
      await returnBook(b.book_id, gNumber);
      setReturns((p) => ({ ...p, [b.book_id]: "done" }));
      // Remove from list after a short delay
      setTimeout(() => {
        setBorrows((prev) => prev.filter((x) => x.book_id !== b.book_id));
        setReturns((p) => { const n = { ...p }; delete n[b.book_id]; return n; });
      }, 1200);
    } catch (e: unknown) {
      setReturns((p) => ({ ...p, [b.book_id]: "error" }));
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-4"
      style={{ paddingTop: "10vh", background: "rgba(3,5,18,0.78)", backdropFilter: "blur(10px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: "rgba(8,5,24,0.97)",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 60px rgba(124,58,237,0.06)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4338ca)" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white"
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Return Books</h2>
              {step === "list" && gNumber && (
                <p className="text-[10px] font-mono mt-0.5" style={{ color: "#a78bfa" }}>
                  {gNumber}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none"
              viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── STEP 1: Enter Student ID ── */}
        {step === "id" && (
          <div className="px-5 py-6 flex flex-col gap-4">
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
              Enter your Student ID to see the books you&apos;ve borrowed.
            </p>

            <div className="flex flex-col gap-2">
              <label className="text-[11px] font-bold uppercase tracking-widest"
                style={{ color: "rgba(255,255,255,0.3)" }}>
                Student ID (G-Number)
              </label>
              <input
                ref={inputRef}
                value={gInput}
                onChange={(e) => setGInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && gInput.trim()) fetchBorrows(gInput);
                }}
                placeholder="e.g. G12345678"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "white",
                  caretColor: "#a78bfa",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              />
              {fetchErr && (
                <p className="text-xs" style={{ color: "#f87171" }}>{fetchErr}</p>
              )}
            </div>

            <button
              onClick={() => gInput.trim() && fetchBorrows(gInput)}
              disabled={!gInput.trim() || fetching}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold
                text-white transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4338ca)", boxShadow: "0 0 20px rgba(124,58,237,0.3)" }}
            >
              {fetching ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Looking up…
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  Find My Books
                </>
              )}
            </button>
          </div>
        )}

        {/* ── STEP 2: Book list ── */}
        {step === "list" && (
          <div>
            {borrows.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-14 px-6 text-center">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" style={{ color: "#10b981" }}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-white">No borrowed books found</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                  All books for <span className="font-mono text-violet-400">{gNumber}</span> have been returned.
                </p>
                <button onClick={() => setStep("id")}
                  className="mt-2 text-xs px-4 py-2 rounded-xl transition-colors"
                  style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)", color: "#a78bfa" }}>
                  Try another ID
                </button>
              </div>
            ) : (
              <>
                <div className="px-5 pt-4 pb-2">
                  <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                    {borrows.length} book{borrows.length !== 1 ? "s" : ""} currently borrowed
                  </p>
                </div>

                <ul className="flex flex-col max-h-[52vh] overflow-y-auto scrollbar-hide">
                  {borrows.map((b) => {
                    const rs = returns[b.book_id];
                    const overdue = b.due_date ? new Date(b.due_date) < new Date() : false;

                    return (
                      <li key={b.book_id}
                        className="flex items-center gap-3 px-5 py-3.5 transition-colors"
                        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.025)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {/* Cover */}
                        <div className="w-10 h-14 rounded-lg flex-shrink-0 overflow-hidden"
                          style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}>
                          {b.cover_url ? (
                            <Image src={b.cover_url} alt={b.title} width={40} height={56}
                              className="w-full h-full object-cover" unoptimized />
                          ) : (
                            <div className="w-full h-full"
                              style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }} />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white line-clamp-2 leading-snug">
                            {b.title}
                          </p>
                          {b.due_date && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="w-1.5 h-1.5 rounded-full"
                                style={{ background: overdue ? "#f87171" : "#10b981" }} />
                              <span className="text-[10px] font-medium"
                                style={{ color: overdue ? "#f87171" : "rgba(16,185,129,0.85)" }}>
                                {overdue ? "Overdue — " : "Due "}
                                {b.due_date}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Return button */}
                        <div className="flex-shrink-0">
                          {rs === "done" ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg"
                              style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none"
                                viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                                  d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                              Returned
                            </span>
                          ) : (
                            <button
                              onClick={() => handleReturn(b)}
                              disabled={rs === "loading"}
                              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5
                                rounded-lg transition-all active:scale-95 disabled:opacity-50"
                              style={{
                                background: "rgba(124,58,237,0.14)",
                                border: "1px solid rgba(124,58,237,0.28)",
                                color: "#a78bfa",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "rgba(124,58,237,0.25)";
                                e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "rgba(124,58,237,0.14)";
                                e.currentTarget.style.borderColor = "rgba(124,58,237,0.28)";
                              }}
                            >
                              {rs === "loading" ? (
                                <span className="w-3 h-3 rounded-full border-2 border-violet-400/30 border-t-violet-400 animate-spin" />
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none"
                                  viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                              )}
                              {rs === "error" ? "Retry" : rs === "loading" ? "Returning…" : "Return"}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <button onClick={() => { setStep("id"); setBorrows([]); setGNumber(""); }}
                    className="text-xs transition-colors"
                    style={{ color: "rgba(255,255,255,0.22)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#a78bfa")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.22)")}>
                    ← Try another ID
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
