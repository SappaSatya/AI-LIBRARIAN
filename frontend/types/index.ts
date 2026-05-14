export interface Author {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface ShelfLocation {
  id: string;
  floor_number: number;
  section_name: string;
  shelf_code: string;
  description?: string;
}

export interface Inventory {
  id: string;
  copy_number: number;
  status: string;
  due_date?: string;
  borrowed_by?: string;
  shelf_location?: ShelfLocation;
}

export interface LibraryMember {
  g_number: string;
  name: string;
  email?: string;
  purpose?: string;
  active_borrows: number;
  borrow_limit: number;
}

export interface BookSearchResult {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  publisher?: string;
  page_count?: number;
  published_year?: number;
  cover_url?: string;
  authors: Author[];
  categories: Category[];
  inventory?: Inventory[];
  similarity?: number;
  reason?: string;
}

export interface WishlistItem {
  id: string;
  title: string;
  cover_url?: string;
  authors: Author[];
}

export interface ChatRequest {
  message: string;
  session_id?: string;
}

export interface ChatResponse {
  reply: string;
  session_id: string;
  books: BookSearchResult[];
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  books?: BookSearchResult[];
}
