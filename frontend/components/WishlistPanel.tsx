"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { WishlistItem } from "@/types";
import { getWishlist, removeFromWishlist } from "@/lib/wishlist";
import { borrowBook } from "@/lib/api";

type BorrowState = "idle" | "loading" | "done" | "error";

interface BorrowStatus {
  state: BorrowState;
  msg?: string;
  dueDate?: string;
}

export function WishlistButton({ onClick }: { onClick: () => void }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(getWishlist().length);
    sync();
    window.addEventListener("wishlist-updated", sync);
    return () => window.removeEventListener("wishlist-updated", sync);
  }, []);

  return (
    <button onClick={onClick}
      className="relative flex items-center gap-2 text-xs font-semibold transition-all px-3 py-1.5 rounded-xl"
      style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "rgba(255,255,255,0.65)" }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" style={{ color: "#f472b6" }}>
        <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
      </svg>
      Wishlist
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white text-[9px] font-bold flex items-center justify-center"
          style={{ background: "#7c3aed" }}>
          {count}
        </span>
      )}
    </button>
  );
}

export default function WishlistPanel({ onClose }: { onClose: () => void }) {
  const [items, setItems]         = useState<WishlistItem[]>([]);
  const [gNumber, setGNumber]     = useState<string | null>(null);
  const [borrows, setBorrows]     = useState<Record<string, BorrowStatus>>({});

  const reload = () => {
    setItems(getWishlist());
    window.dispatchEvent(new Event("wishlist-updated"));
  };

  useEffect(() => {
    reload();
    setGNumber(localStorage.getItem("lib_g_number"));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  function remove(id: string) {
    removeFromWishlist(id);
    reload();
  }

  async function handleBorrow(item: WishlistItem) {
    if (!gNumber) {
      setBorrows((p) => ({ ...p, [item.id]: { state: "error", msg: "Register with your Student ID first." } }));
      return;
    }
    setBorrows((p) => ({ ...p, [item.id]: { state: "loading" } }));
    try {
      const res = await borrowBook(item.id, gNumber);
      setBorrows((p) => ({ ...p, [item.id]: { state: "done", dueDate: res.due_date, msg: `Borrowed! Due ${res.due_date ?? "in 7 days"}` } }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Could not borrow right now.";
      setBorrows((p) => ({ ...p, [item.id]: { state: "error", msg } }));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: "rgba(4,3,16,0.72)" }} onClick={onClose} />

      <div className="relative w-80 h-full flex flex-col"
        style={{ background: "#07051a", borderLeft: "1px solid rgba(255,255,255,0.08)", boxShadow: "-20px 0 60px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4" style={{ color: "#f472b6" }}>
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
            </svg>
            <h2 className="text-sm font-semibold text-white">Wishlist</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
              style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa" }}>
              {items.length}
            </span>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(244,114,182,0.08)", border: "1px solid rgba(244,114,182,0.15)" }}>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" style={{ color: "#f472b6" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>Your wishlist is empty</p>
              <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.2)" }}>
                Open any book in chat and hit &ldquo;Add to Wishlist&rdquo; to save it here.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-0">
              {items.map((item) => {
                const authors = item.authors.map((a) => a.name).join(", ") || "Unknown";
                const bs = borrows[item.id];
                const isDone = bs?.state === "done";

                return (
                  <li key={item.id} className="px-4 py-4"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="flex items-start gap-3">
                      {/* Cover */}
                      <div className="w-10 h-14 rounded-lg flex-shrink-0 overflow-hidden"
                        style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}>
                        {item.cover_url ? (
                          <Image src={item.cover_url} alt={item.title} width={40} height={56}
                            className="w-full h-full object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"
                            style={{ background: "linear-gradient(135deg,#1e1b4b,#312e81)" }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" style={{ color: "#a78bfa" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Info + actions */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white line-clamp-2 leading-snug">{item.title}</p>
                        <p className="text-[11px] mt-0.5 line-clamp-1" style={{ color: "rgba(255,255,255,0.3)" }}>{authors}</p>

                        {/* Status */}
                        {isDone && (
                          <div className="mt-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <p className="text-[11px] font-medium" style={{ color: "#10b981" }}>{bs.msg}</p>
                          </div>
                        )}
                        {bs?.state === "error" && (
                          <p className="text-[11px] mt-1.5 leading-snug" style={{ color: "#f87171" }}>{bs.msg}</p>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 mt-2.5">
                          {!isDone && (
                            <button onClick={() => handleBorrow(item)}
                              disabled={bs?.state === "loading"}
                              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                              style={{ background: "linear-gradient(135deg,#7c3aed,#4338ca)", color: "white", boxShadow: "0 0 12px rgba(124,58,237,0.3)" }}>
                              {bs?.state === "loading" ? (
                                <>
                                  <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                  Borrowing…
                                </>
                              ) : (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                                  </svg>
                                  Borrow
                                </>
                              )}
                            </button>
                          )}
                          <button onClick={() => remove(item.id)}
                            className="text-[11px] px-2.5 py-1.5 rounded-lg transition-colors"
                            style={{ color: "rgba(255,255,255,0.25)", background: "rgba(255,255,255,0.04)" }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = "#f87171"; e.currentTarget.style.background = "rgba(248,113,113,0.08)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.25)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}>
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <button onClick={() => { items.forEach((i) => removeFromWishlist(i.id)); reload(); }}
              className="w-full text-xs py-1.5 rounded-lg transition-colors"
              style={{ color: "rgba(255,255,255,0.22)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.22)")}>
              Clear all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
