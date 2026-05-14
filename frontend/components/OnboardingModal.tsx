"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerMember } from "@/lib/api";

const PURPOSES = [
  { value: "fiction",    label: "Fiction & Stories" },
  { value: "nonfiction", label: "Non-fiction & Learning" },
  { value: "academic",   label: "Academic & Research" },
  { value: "browsing",   label: "Just browsing" },
];

export default function OnboardingModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [gNumber,  setGNumber]  = useState("");
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [purpose,  setPurpose]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const gValid = /^G\d{8}$/i.test(gNumber.trim());
  const canSubmit = name.trim().length > 0 && gValid && !loading;

  async function handleStart() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    const g = gNumber.trim().toUpperCase();
    try {
      await registerMember({ g_number: g, name: name.trim(), email: email.trim() || undefined, purpose: purpose || undefined });
      localStorage.setItem("lib_g_number",    g);
      localStorage.setItem("lib_user_name",   name.trim());
      if (email.trim()) localStorage.setItem("lib_user_email", email.trim());
      if (purpose)      localStorage.setItem("lib_user_purpose", purpose);
      router.push("/chat");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Registration failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function formatGNumber(raw: string) {
    const upper = raw.toUpperCase();
    if (upper === "" || upper === "G") return upper;
    if (upper.startsWith("G")) {
      const digits = upper.slice(1).replace(/\D/g, "").slice(0, 8);
      return "G" + digits;
    }
    const digits = upper.replace(/\D/g, "").slice(0, 8);
    return "G" + digits;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#0d0d1c] border border-white/10 rounded-3xl shadow-2xl
        w-full max-w-md p-8 flex flex-col gap-5">

        {/* Close */}
        <button onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10
            hover:bg-white/20 flex items-center justify-center text-white/50 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white">GMU Library Access</h2>
          <p className="text-sm text-white/45">Enter your GMU credentials to get started.</p>
        </div>

        {/* G-Number */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            GMU G-Number <span className="text-violet-400">*</span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={gNumber}
              onChange={(e) => setGNumber(formatGNumber(e.target.value))}
              placeholder="G12345678"
              maxLength={9}
              className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white
                placeholder-white/20 focus:outline-none transition-colors font-mono tracking-widest
                ${gNumber && !gValid
                  ? "border-red-500/50 focus:border-red-400"
                  : gValid
                  ? "border-violet-500/60 focus:border-violet-400"
                  : "border-white/10 focus:border-violet-500"
                }`}
            />
            {gValid && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-xs">✓</span>
            )}
          </div>
          {gNumber && !gValid && (
            <p className="text-xs text-red-400">Format: G followed by 8 digits (e.g. G12345678)</p>
          )}
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            Full Name <span className="text-violet-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Harsha Sappa"
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm
              text-white placeholder-white/20 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            GMU Email <span className="text-white/25">(optional)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="g12345678@masonlive.gmu.edu"
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm
              text-white placeholder-white/20 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>

        {/* Purpose */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            What are you looking for? <span className="text-white/25">(optional)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PURPOSES.map((p) => (
              <button key={p.value}
                onClick={() => setPurpose(p.value === purpose ? "" : p.value)}
                className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all text-left
                  ${purpose === p.value
                    ? "bg-violet-600/30 border-violet-500/60 text-white"
                    : "bg-white/[0.03] border-white/10 text-white/50 hover:border-white/25 hover:text-white/80"
                  }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* CTA */}
        <button onClick={handleStart} disabled={!canSubmit}
          className="w-full bg-violet-600 hover:bg-violet-500 disabled:opacity-40
            disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl
            transition-all active:scale-95 flex items-center justify-center gap-2">
          {loading ? (
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-white/60 rounded-full animate-bounce [animation-delay:300ms]" />
            </span>
          ) : (
            <>
              Enter Library
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
              </svg>
            </>
          )}
        </button>

        <p className="text-center text-xs text-white/20">
          GMU students & staff · Borrow up to 3 books · 1-week loan period
        </p>
      </div>
    </div>
  );
}
