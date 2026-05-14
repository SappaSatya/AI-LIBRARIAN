"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Message } from "@/types";
import { sendChat } from "@/lib/api";
import ChatMessage from "@/components/ChatMessage";
import Sidebar from "@/components/Sidebar";
import { useVoice } from "@/hooks/useVoice";

interface Session {
  id: string;
  title: string;
  messages: Message[];
}

const SUGGESTIONS = [
  "Books about machine learning for beginners",
  "Recommend a good book on data structures",
  "What history books do you have?",
  "I need books on climate change",
];

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeSessionIdRef = useRef<string | undefined>(undefined);

  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const messages = activeSession?.messages ?? [];

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = useCallback(async (text?: string) => {
    const query = (text ?? input).trim();
    if (!query) return;

    setInput("");
    setError(null);
    setLoading(true);

    const userMsg: Message = { role: "user", content: query };
    const currentSessionId = activeSessionIdRef.current;

    if (!currentSessionId) {
      setSessions((prev) => [
        { id: "__pending__", title: query.slice(0, 40), messages: [userMsg] },
        ...prev,
      ]);
      setActiveSessionId("__pending__");
    } else {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId ? { ...s, messages: [...s.messages, userMsg] } : s
        )
      );
    }

    try {
      const response = await sendChat({
        message: query,
        session_id: currentSessionId === "__pending__" ? undefined : currentSessionId,
      });

      const assistantMsg: Message = {
        role: "assistant",
        content: response.reply,
        books: response.books,
      };

      setSessions((prev) =>
        prev.map((s) => {
          if (s.id === "__pending__" || s.id === currentSessionId) {
            return {
              id: response.session_id,
              title: s.title,
              messages: [...s.messages.filter((m) => m !== userMsg), userMsg, assistantMsg],
            };
          }
          return s;
        })
      );
      setActiveSessionId(response.session_id);
      return response.reply;
    } catch {
      setError("Could not reach the Library AI server. Is the backend running?");
      setSessions((prev) => prev.filter((s) => s.id !== "__pending__"));
      setActiveSessionId(undefined);
    } finally {
      setLoading(false);
    }
  }, [input]);

  const { status: voiceStatus, supported: voiceSupported, startListening, stopListening, speak, stopSpeaking } = useVoice({
    onTranscript: async (text) => {
      const reply = await handleSend(text);
      if (reply) speak(reply);
    },
  });

  function startNewSession() {
    stopSpeaking();
    setActiveSessionId(undefined);
    setInput("");
    setError(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const isEmpty = messages.length === 0;
  const isListening = voiceStatus === "listening";
  const isSpeaking = voiceStatus === "speaking";

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar
        sessions={sessions}
        activeId={activeSessionId}
        onSelect={(id) => { stopSpeaking(); setActiveSessionId(id); }}
        onNew={startNewSession}
      />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Top bar */}
        <header className="flex-shrink-0 h-14 bg-white border-b border-gray-100 flex items-center justify-between px-6">
          <h2 className="text-sm font-medium text-gray-700">
            {activeSession ? activeSession.title : "New conversation"}
          </h2>
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5 transition-colors"
            >
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              Speaking — click to stop
            </button>
          )}
        </header>

        {/* Chat area */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            {isEmpty && (
              <div className="flex flex-col items-center gap-8 mt-12 text-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">Library AI</h1>
                    <p className="text-sm text-gray-500 mt-1">Ask me anything — type or use the mic.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="text-left px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-600 hover:border-gray-300 hover:text-gray-900 hover:shadow-sm transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}

            {loading && (
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">LA</span>
                </div>
                <div className="flex gap-1.5 px-4 py-3 bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </main>

        {/* Input bar */}
        <div className="flex-shrink-0 bg-white border-t border-gray-100 px-6 py-4">
          {isListening && (
            <div className="max-w-3xl mx-auto mb-3 flex items-center gap-2 text-sm text-gray-500">
              <span className="flex gap-0.5 items-end h-4">
                <span className="w-1 bg-red-500 rounded-full animate-bounce [animation-delay:0ms]" style={{height:"60%"}} />
                <span className="w-1 bg-red-500 rounded-full animate-bounce [animation-delay:100ms]" style={{height:"100%"}} />
                <span className="w-1 bg-red-500 rounded-full animate-bounce [animation-delay:200ms]" style={{height:"70%"}} />
                <span className="w-1 bg-red-500 rounded-full animate-bounce [animation-delay:300ms]" style={{height:"90%"}} />
              </span>
              <span className="text-red-500 font-medium">Listening...</span>
              <button onClick={stopListening} className="ml-auto text-xs text-gray-400 hover:text-gray-700">Cancel</button>
            </div>
          )}
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about books, topics, or recommendations..."
              rows={1}
              disabled={isListening}
              className="flex-1 resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent max-h-32 overflow-y-auto disabled:opacity-50"
              style={{ minHeight: "48px" }}
            />

            {/* Mic button */}
            {voiceSupported && (
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={loading || isSpeaking}
                title={isListening ? "Stop listening" : "Speak your query"}
                className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                  isListening
                    ? "bg-red-500 text-white animate-pulse"
                    : "border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
                  <path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" />
                </svg>
              </button>
            )}

            {/* Send button */}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading || isListening}
              className="w-11 h-11 rounded-xl bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            Enter to send · Shift+Enter for new line · 🎤 mic for voice
          </p>
        </div>
      </div>
    </div>
  );
}
