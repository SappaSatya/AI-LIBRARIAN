import { WishlistItem } from "@/types";

const KEY = "librarian_wishlist";

export function getWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function dispatch() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("wishlist-updated"));
}

export function addToWishlist(item: WishlistItem): boolean {
  const list = getWishlist();
  if (list.some((b) => b.id === item.id)) return false;
  localStorage.setItem(KEY, JSON.stringify([...list, item]));
  dispatch();
  return true;
}

export function removeFromWishlist(id: string): void {
  const list = getWishlist().filter((b) => b.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
  dispatch();
}

export function isInWishlist(id: string): boolean {
  return getWishlist().some((b) => b.id === id);
}
