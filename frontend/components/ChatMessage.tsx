"use client";

import { useState } from "react";
import Image from "next/image";
import { Message, BookSearchResult } from "@/types";
import BookModal from "./BookModal";

function AvailBadge({ inventory }: { inventory?: BookSearchResult["inventory"] }) {
  if (!inventory || inventory.length === 0) return null;
  if (inventory.some((i) => i.status === "available"))
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", color: "#10b981" }}>Available</span>;
  const co = inventory.find((i) => i.status === "checked_out");
  if (co)
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b" }}>{co.due_date ? `Back ${co.due_date}` : "Checked out"}</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)" }}>Reserved</span>;
}

function BookRow({ book }: { book: BookSearchResult }) {
  const [open, setOpen] = useState(false);
  const author = book.authors[0]?.name ?? "Unknown";
  return (
    <>
      {open && <BookModal book={book} onClose={() => setOpen(false)} />}
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-xl transition-all group"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.055)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}>
        {/* Cover */}
        <div className="w-10 h-14 rounded-lg overflow-hidden flex-shrink-0"
          style={{ boxShadow: "0 4px 14px rgba(0,0,0,0.5)" }}>
          {book.cover_url ? (
            <Image src={book.cover_url} alt={book.title} width={40} height={56}
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
        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white line-clamp-1 leading-snug">{book.title}</p>
          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "rgba(255,255,255,0.38)" }}>{author}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <AvailBadge inventory={book.inventory} />
          </div>
        </div>
        {/* Arrow */}
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: "#a78bfa" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
        </svg>
      </button>
    </>
  );
}

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const books  = message.books?.slice(0, 4) ?? [];

  return (
    <div className={`flex flex-col gap-3 ${isUser ? "items-end" : "items-start"}`}>
      <div className={`flex items-start gap-3 w-full max-w-2xl ${isUser ? "flex-row-reverse ml-auto" : "flex-row"}`}>

        {/* AI avatar */}
        {!isUser && (
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4338ca)" }}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
            </svg>
          </div>
        )}

        {/* Bubble */}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-lg ${isUser ? "rounded-tr-sm" : "rounded-tl-sm"}`}
          style={isUser
            ? { background: "rgba(124,58,237,0.18)", border: "1px solid rgba(124,58,237,0.3)", color: "rgba(255,255,255,0.92)" }
            : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.82)" }
          }>
          {message.content}
        </div>
      </div>

      {/* Book cards */}
      {!isUser && books.length > 0 && (
        <div className="w-full max-w-2xl pl-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2"
            style={{ color: "rgba(255,255,255,0.22)" }}>
            Recommended Books
          </p>
          <div className="flex flex-col gap-2">
            {books.map((book) => (
              <BookRow key={book.id} book={book} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
