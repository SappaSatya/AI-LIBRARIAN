"use client";

import { BookSearchResult } from "@/types";

export default function BookCard({ book }: { book: BookSearchResult }) {
  const authors = book.authors.map((a) => a.name).join(", ") || "Unknown";
  const category = book.categories[0]?.name ?? "General";

  return (
    <div className="flex flex-col gap-3 bg-white border border-gray-100 rounded-2xl p-4 w-56 flex-shrink-0 hover:border-gray-300 hover:shadow-sm transition-all">
      {/* Cover */}
      <div className="w-full h-28 bg-gray-50 border border-gray-100 rounded-xl flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="font-semibold text-sm text-gray-900 leading-snug line-clamp-2">
          {book.title}
        </h3>
        <p className="text-xs text-gray-500 line-clamp-1">{authors}</p>
        {book.published_year && (
          <p className="text-xs text-gray-400">{book.published_year}</p>
        )}
      </div>

      <span className="self-start text-xs bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full font-medium">
        {category}
      </span>

      {book.reason && (
        <p className="text-xs text-gray-400 border-t border-gray-100 pt-2.5 line-clamp-3 leading-relaxed">
          {book.reason}
        </p>
      )}
    </div>
  );
}
