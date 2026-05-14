"use client";

import { Message } from "@/types";
import BookCard from "./BookCard";

export default function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex flex-col gap-4 ${isUser ? "items-end" : "items-start"}`}>
      <div className={`flex items-start gap-3 max-w-2xl ${isUser ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar */}
        {!isUser && (
          <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">LA</span>
          </div>
        )}

        {/* Bubble */}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "bg-gray-900 text-white rounded-tr-sm max-w-md"
              : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm shadow-sm"
          }`}
        >
          {message.content}
        </div>
      </div>

      {/* Book cards */}
      {!isUser && message.books && message.books.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1 max-w-full pl-10 scrollbar-hide">
          {message.books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
