"use client";

import { useState } from "react";
import Image from "next/image";
import { BookSearchResult } from "@/types";
import BookModal from "./BookModal";

function availabilityInfo(inventory?: BookSearchResult["inventory"]) {
  if (!inventory || inventory.length === 0) return null;

  if (inventory.some((i) => i.status === "available"))
    return { label: "● Available", className: "text-green-600 bg-green-50 border border-green-200" };

  if (inventory.some((i) => i.status === "reserved"))
    return { label: "● Reserved", className: "text-yellow-600 bg-yellow-50 border border-yellow-200" };

  const checkedOut = inventory.find((i) => i.status === "checked_out");
  const due = checkedOut?.due_date ? ` · Due ${checkedOut.due_date}` : "";
  return { label: `● Checked Out${due}`, className: "text-red-500 bg-red-50 border border-red-200" };
}

export default function BookCard({ book }: { book: BookSearchResult }) {
  const [open, setOpen] = useState(false);
  const authors = book.authors.map((a) => a.name).join(", ") || "Unknown";
  const avail = availabilityInfo(book.inventory);

  return (
    <>
      {open && <BookModal book={book} onClose={() => setOpen(false)} />}
      <div
        className="flex flex-col bg-transparent border-0 hover:-translate-y-1 transition-all duration-200 overflow-hidden cursor-pointer"
        onClick={() => setOpen(true)}
      >
      {/* 3D Book cover */}
      <div
        className="w-full flex justify-center items-center flex-shrink-0"
        style={{
          minHeight: '220px',
          perspective: '1000px',
        }}
      >
        <div
          className="relative"
          style={{
            width: '130px',
            height: '190px',
            transformStyle: 'preserve-3d',
            transform: 'rotateY(-22deg)',
            transition: 'transform 0.4s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'rotateY(-8deg)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'rotateY(-22deg)')}
        >
          {/* Spine */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '22px',
              height: '100%',
              background: 'linear-gradient(to right, #0d0d0d 0%, #2e2e2e 60%, #1a1a1a 100%)',
              transformOrigin: 'right center',
              transform: 'rotateY(-90deg)',
              borderRadius: '2px 0 0 2px',
            }}
          />

          {/* Front cover */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'hidden',
              borderRadius: '0 4px 4px 0',
              boxShadow: '8px 12px 30px rgba(0,0,0,0.35)',
            }}
          >
            {book.cover_url ? (
              <Image
                src={book.cover_url}
                alt={book.title}
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400 flex flex-col items-center justify-center gap-2 px-3 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-white text-[11px] font-semibold line-clamp-3 leading-snug">{book.title}</p>
              </div>
            )}
          </div>

          {/* Bottom shadow */}
          <div
            style={{
              position: 'absolute',
              bottom: '-14px',
              left: '10%',
              width: '85%',
              height: '14px',
              background: 'rgba(0,0,0,0.2)',
              filter: 'blur(8px)',
              borderRadius: '50%',
              transform: 'rotateX(90deg)',
            }}
          />
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col items-center gap-2 px-3 pb-3 pt-2 text-center">
        <h3 className="font-bold text-sm text-gray-900 line-clamp-2 leading-snug">{book.title}</h3>
        <p className="text-xs text-gray-400 line-clamp-1">{authors}</p>

        {avail && (
          <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full mt-1 ${avail.className}`}>
            {avail.label}
          </span>
        )}
      </div>
    </div>
    </>
  );
}
