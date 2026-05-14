from __future__ import annotations
from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class AuthorOut(BaseModel):
    id:   UUID
    name: str

    model_config = {"from_attributes": True}


class CategoryOut(BaseModel):
    id:   UUID
    name: str

    model_config = {"from_attributes": True}


class ShelfLocationOut(BaseModel):
    id:           UUID
    floor_number: int
    section_name: str
    shelf_code:   str
    description:  Optional[str] = None

    model_config = {"from_attributes": True}


class InventoryOut(BaseModel):
    id:             UUID
    copy_number:    int
    status:         str
    shelf_location: Optional[ShelfLocationOut] = None

    model_config = {"from_attributes": True}


class BookSummary(BaseModel):
    id:             UUID
    title:          str
    subtitle:       Optional[str] = None
    published_year: Optional[int] = None
    cover_url:      Optional[str] = None
    authors:        list[AuthorOut] = []
    categories:     list[CategoryOut] = []

    model_config = {"from_attributes": True}


class BookDetail(BookSummary):
    description: Optional[str] = None
    publisher:   Optional[str] = None
    page_count:  Optional[int] = None
    language:    Optional[str] = None
    inventory:   list[InventoryOut] = []


class BookSearchResult(BookSummary):
    similarity: Optional[float] = None
    reason:     Optional[str] = None


# ── Chat ────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message:    str
    session_id: Optional[UUID] = None


class ChatResponse(BaseModel):
    reply:      str
    session_id: UUID
    books:      list[BookSearchResult] = []


# ── Pagination wrapper ───────────────────────────────────────────────────────

class PaginatedBooks(BaseModel):
    total: int
    page:  int
    limit: int
    items: list[BookSummary]
