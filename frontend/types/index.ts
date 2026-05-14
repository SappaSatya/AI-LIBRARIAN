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
  shelf_location?: ShelfLocation;
}

export interface BookSearchResult {
  id: string;
  title: string;
  subtitle?: string;
  published_year?: number;
  cover_url?: string;
  authors: Author[];
  categories: Category[];
  similarity?: number;
  reason?: string;
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
