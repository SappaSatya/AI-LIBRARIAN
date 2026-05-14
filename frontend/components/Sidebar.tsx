"use client";

import { Message } from "@/types";

interface Session {
  id: string;
  title: string;
}

interface SidebarProps {
  sessions: Session[];
  activeId: string | undefined;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export default function Sidebar({ sessions, activeId, onSelect, onNew }: SidebarProps) {
  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center">
            <span className="text-white text-xs font-bold">LA</span>
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm leading-tight">Library AI</p>
            <p className="text-gray-400 text-xs">Online Library</p>
          </div>
        </div>
      </div>

      {/* New chat */}
      <div className="px-4 py-3">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New conversation
        </button>
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto px-4 py-1">
        {sessions.length > 0 && (
          <>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2 px-1">Recent</p>
            <ul className="flex flex-col gap-0.5">
              {sessions.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => onSelect(s.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                      activeId === s.id
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    {s.title}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">Built by Satya Harsha Sappa</p>
      </div>
    </aside>
  );
}
