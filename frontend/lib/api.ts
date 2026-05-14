import { ChatRequest, ChatResponse } from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const sendChat = (req: ChatRequest) =>
  apiFetch<ChatResponse>("/chat", { method: "POST", body: JSON.stringify(req) });

export const registerMember = (body: {
  g_number: string; name: string; email?: string; purpose?: string;
}) => apiFetch<{ g_number: string; name: string; active_borrows: number; borrow_limit: number }>(
  "/members", { method: "POST", body: JSON.stringify(body) }
);

export const getMember = (g_number: string) =>
  apiFetch<{ g_number: string; name: string; active_borrows: number; borrow_limit: number }>(
    `/members/${g_number}`
  );

export const borrowBook = (book_id: string, g_number: string) =>
  apiFetch<{
    success: boolean; message: string; due_date?: string;
    location?: string; active_borrows: number; borrow_limit: number;
  }>(`/books/${book_id}/borrow`, { method: "POST", body: JSON.stringify({ g_number }) });

export const returnBook = (book_id: string, g_number: string) =>
  apiFetch<{ success: boolean; message: string; active_borrows: number }>(
    `/books/${book_id}/return`, { method: "POST", body: JSON.stringify({ g_number }) }
  );

export const locateBook = (q: string) =>
  apiFetch<Array<{
    id: string; title: string;
    copies: Array<{ copy_number: number; status: string; location: string; due_date?: string }>;
  }>>(`/books/locate?q=${encodeURIComponent(q)}`);
