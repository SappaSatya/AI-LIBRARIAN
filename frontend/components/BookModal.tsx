"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { BookSearchResult } from "@/types";
import { addToWishlist, isInWishlist } from "@/lib/wishlist";
import { borrowBook } from "@/lib/api";

type ActionState = "idle" | "loading" | "error";

interface BorrowResult {
  due_date?: string;
  location?: string;
  active_borrows: number;
  borrow_limit: number;
}

export default function BookModal({
  book,
  onClose,
}: {
  book: BookSearchResult;
  onClose: () => void;
}) {
  const [action,    setAction]    = useState<ActionState>("idle");
  const [borrowed,  setBorrowed]  = useState<BorrowResult | null>(null);
  const [errMsg,    setErrMsg]    = useState("");
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [gNumber,   setGNumber]   = useState<string | null>(null);

  useEffect(() => {
    setInWishlist(isInWishlist(book.id));
    setGNumber(localStorage.getItem("lib_g_number"));
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [book.id, onClose]);

  const authors    = book.authors.map((a) => a.name).join(", ") || "Unknown";
  const inventory  = book.inventory ?? [];
  const available  = inventory.find((i) => i.status === "available");
  const checkedOut = inventory.find((i) => i.status === "checked_out");
  const reserved   = inventory.find((i) => i.status === "reserved");

  /* Best location to show (prefer available copy's location) */
  const displayInv = available ?? checkedOut ?? reserved;
  const loc = displayInv?.shelf_location;
  const locationStr = loc
    ? `Floor ${loc.floor_number} · ${loc.section_name} · Shelf ${loc.shelf_code}`
    : null;

  async function handleBorrow() {
    if (!available) return;
    if (!gNumber) {
      setErrMsg("Please log in with your G-Number first.");
      setAction("error");
      return;
    }
    setAction("loading");
    setErrMsg("");
    try {
      const res = await borrowBook(book.id, gNumber);
      setBorrowed(res);
      setAction("idle");
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "Could not borrow right now.");
      setAction("error");
    }
  }

  function handleWishlist() {
    const added = addToWishlist({ id: book.id, title: book.title, cover_url: book.cover_url, authors: book.authors });
    setInWishlist(true);
    setWishlisted(added);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-gray-100
            hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        </button>

        <div className="flex gap-7 p-8">
          {/* 3D Book cover */}
          <div className="flex-shrink-0 flex items-start justify-center pt-1"
            style={{ perspective: "1000px" }}>
            <div
              style={{ width: 130, height: 190, transformStyle: "preserve-3d",
                transform: "rotateY(-22deg)", transition: "transform 0.4s ease" }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = "rotateY(-8deg)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform = "rotateY(-22deg)")}>
              <div style={{ position: "absolute", top: 0, left: 0, width: 20, height: "100%",
                background: "linear-gradient(to right,#0d0d0d,#2e2e2e 60%,#1a1a1a)",
                transformOrigin: "right center", transform: "rotateY(-90deg)",
                borderRadius: "2px 0 0 2px" }} />
              <div style={{ position: "absolute", inset: 0, overflow: "hidden",
                borderRadius: "0 4px 4px 0",
                boxShadow: "8px 12px 30px rgba(0,0,0,0.35)" }}>
                {book.cover_url ? (
                  <Image src={book.cover_url} alt={book.title} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-500
                    flex items-center justify-center p-3 text-center">
                    <p className="text-white text-xs font-semibold line-clamp-4">{book.title}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            <div>
              <h2 className="text-xl font-bold text-gray-900 leading-snug">{book.title}</h2>
              {book.subtitle && <p className="text-sm text-gray-500 mt-0.5">{book.subtitle}</p>}
              <p className="text-sm text-gray-500 mt-1">{authors}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-400">
                {book.published_year && <span>{book.published_year}</span>}
                {book.publisher      && <span>· {book.publisher}</span>}
                {book.page_count     && <span>· {book.page_count} pages</span>}
              </div>
            </div>

            {/* Availability */}
            <div className="flex flex-col gap-1.5">
              {available ? (
                <span className="self-start text-xs font-semibold text-green-600
                  bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                  ● Available — ready to pick up
                </span>
              ) : checkedOut ? (
                <span className="self-start text-xs font-semibold text-orange-500
                  bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full">
                  ● Checked Out{checkedOut.due_date ? ` · due ${checkedOut.due_date}` : ""}
                </span>
              ) : reserved ? (
                <span className="self-start text-xs font-semibold text-yellow-600
                  bg-yellow-50 border border-yellow-200 px-2.5 py-1 rounded-full">
                  ● Reserved
                </span>
              ) : null}

              {/* Location */}
              {locationStr && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-violet-500"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
                  </svg>
                  <span className="font-medium text-gray-700">{locationStr}</span>
                </div>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
              {book.description ?? book.reason ?? "No description available."}
            </p>
          </div>
        </div>

        {/* Action area */}
        <div className="px-8 pb-8 flex flex-col gap-3">

          {/* Borrow success */}
          {borrowed && (
            <div className="flex items-start gap-3 bg-green-50 border border-green-200
              rounded-2xl px-5 py-4">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center
                justify-center flex-shrink-0 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
                  className="w-4 h-4 text-white">
                  <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75
                    0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75
                    0 011.04-.208z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-800">Borrowed! Enjoy your read.</p>
                {borrowed.due_date && (
                  <p className="text-xs text-green-600 mt-0.5">Due back: {borrowed.due_date}</p>
                )}
                {borrowed.location && (
                  <p className="text-xs text-green-600 mt-0.5">📍 {borrowed.location}</p>
                )}
                <p className="text-xs text-green-600/70 mt-1">
                  {borrowed.active_borrows}/{borrowed.borrow_limit} books currently borrowed
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {action === "error" && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm
              rounded-xl px-4 py-3">
              {errMsg}
            </div>
          )}

          {/* Wishlist success */}
          {wishlisted && !borrowed && (
            <div className="bg-blue-50 border border-blue-100 text-blue-700 text-sm
              rounded-xl px-4 py-3">
              Added to your wishlist!
            </div>
          )}

          {!borrowed && (
            <div className="flex gap-3">
              <button onClick={handleBorrow}
                disabled={!available || action === "loading"}
                className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all
                  active:scale-95 ${available
                    ? "bg-gray-900 text-white hover:bg-gray-700"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
                {action === "loading" ? "Borrowing…"
                  : available ? "Borrow This Book"
                  : checkedOut ? `Back on ${checkedOut.due_date ?? "return"}`
                  : "Not Available"}
              </button>

              <button onClick={handleWishlist} disabled={inWishlist}
                className={`flex-1 py-3 rounded-2xl text-sm font-semibold border
                  transition-all active:scale-95 ${inWishlist
                    ? "border-blue-200 bg-blue-50 text-blue-500 cursor-default"
                    : "border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50"}`}>
                {inWishlist ? "✓ In Wishlist" : "+ Add to Wishlist"}
              </button>
            </div>
          )}

          {!gNumber && !borrowed && available && (
            <p className="text-center text-xs text-gray-400">
              Log in with your GMU G-Number on the home page to borrow books.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
