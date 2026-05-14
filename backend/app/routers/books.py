import re
from uuid import UUID
from typing import Optional
from datetime import date, timedelta, datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.models import Book, BookInventory, Category, LibraryMember, ShelfLocation
from app.schemas import (
    BookDetail, BookSummary, PaginatedBooks,
    MemberRegister, MemberOut, BorrowRequest,
)

router = APIRouter(prefix="/books", tags=["books"])

BORROW_LIMIT   = 3
LOAN_DAYS      = 7
G_NUMBER_REGEX = re.compile(r"^G\d{8}$")


def _book_query(db: Session):
    return (
        db.query(Book)
        .options(
            joinedload(Book.authors),
            joinedload(Book.categories),
            joinedload(Book.inventory).joinedload(BookInventory.shelf_location),
        )
    )


# ── List / Search ────────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedBooks)
def list_books(
    category: Optional[str] = Query(None),
    search:   Optional[str] = Query(None),
    page:     int           = Query(1, ge=1),
    limit:    int           = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Book).options(joinedload(Book.authors), joinedload(Book.categories))

    if category:
        q = q.join(Book.categories).filter(func.lower(Category.name) == category.lower())
    if search:
        q = q.filter(Book.title.ilike(f"%{search}%"))

    total = q.count()
    items = q.offset((page - 1) * limit).limit(limit).all()
    return PaginatedBooks(total=total, page=page, limit=limit, items=items)


# ── Locate book (no auth needed) ─────────────────────────────────────────────

class LocationResult(BaseModel):
    id:    str
    title: str
    copies: list[dict]


@router.get("/locate", response_model=list[LocationResult])
def locate_book(
    q: str = Query(..., description="Book title or partial title"),
    db: Session = Depends(get_db),
):
    """Return shelf location and availability for books matching the query — no login needed."""
    books = (
        db.query(Book)
        .options(
            joinedload(Book.inventory).joinedload(BookInventory.shelf_location),
        )
        .filter(Book.title.ilike(f"%{q}%"))
        .limit(5)
        .all()
    )

    results = []
    for book in books:
        copies = []
        for inv in book.inventory:
            if inv.status in ("lost", "maintenance"):
                continue
            loc = inv.shelf_location
            location_str = (
                f"Floor {loc.floor_number} · {loc.section_name} · Shelf {loc.shelf_code}"
                if loc else "Location not assigned"
            )
            copy_info = {
                "copy_number": inv.copy_number,
                "status": inv.status,
                "location": location_str,
            }
            if inv.due_date:
                copy_info["due_date"] = inv.due_date.strftime("%B %d, %Y")
            copies.append(copy_info)

        results.append(LocationResult(
            id=str(book.id),
            title=book.title,
            copies=copies,
        ))

    return results


# ── Get single book ──────────────────────────────────────────────────────────

@router.get("/{book_id}", response_model=BookDetail)
def get_book(book_id: UUID, db: Session = Depends(get_db)):
    book = (
        db.query(Book)
        .options(
            joinedload(Book.authors),
            joinedload(Book.categories),
            joinedload(Book.inventory).joinedload(BookInventory.shelf_location),
        )
        .filter(Book.id == book_id)
        .first()
    )
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book


# ── Borrow ───────────────────────────────────────────────────────────────────

class BorrowResponse(BaseModel):
    success:       bool
    message:       str
    due_date:      Optional[str] = None
    location:      Optional[str] = None
    active_borrows: int = 0
    borrow_limit:  int = BORROW_LIMIT


@router.post("/{book_id}/borrow", response_model=BorrowResponse)
def borrow_book(
    book_id: UUID,
    body: BorrowRequest,
    db: Session = Depends(get_db),
):
    g = body.g_number.upper()
    if not G_NUMBER_REGEX.match(g):
        raise HTTPException(status_code=400, detail="Invalid G-Number format. Use G########")

    # Ensure member exists
    member = db.query(LibraryMember).filter(LibraryMember.g_number == g).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found. Please register first.")

    # Count active borrows
    active = (
        db.query(BookInventory)
        .filter(BookInventory.borrowed_by == g, BookInventory.status == "checked_out")
        .count()
    )
    if active >= BORROW_LIMIT:
        raise HTTPException(
            status_code=409,
            detail=f"Borrow limit reached ({BORROW_LIMIT} books). Please return a book first.",
        )

    # Find available copy
    copy = (
        db.query(BookInventory)
        .filter(BookInventory.book_id == book_id, BookInventory.status == "available")
        .first()
    )
    if not copy:
        raise HTTPException(status_code=409, detail="No available copies to borrow right now.")

    due = date.today() + timedelta(days=LOAN_DAYS)
    copy.status      = "checked_out"
    copy.due_date    = due
    copy.borrowed_by = g
    copy.updated_at  = datetime.now(timezone.utc)
    db.commit()

    loc = copy.shelf_location
    location_str = (
        f"Floor {loc.floor_number} · {loc.section_name} · Shelf {loc.shelf_code}"
        if loc else None
    )

    return BorrowResponse(
        success=True,
        message="Book borrowed successfully!",
        due_date=due.strftime("%B %d, %Y"),
        location=location_str,
        active_borrows=active + 1,
        borrow_limit=BORROW_LIMIT,
    )


# ── Return ───────────────────────────────────────────────────────────────────

class ReturnResponse(BaseModel):
    success: bool
    message: str
    active_borrows: int = 0


@router.post("/{book_id}/return", response_model=ReturnResponse)
def return_book(
    book_id: UUID,
    body: BorrowRequest,
    db: Session = Depends(get_db),
):
    g = body.g_number.upper()

    copy = (
        db.query(BookInventory)
        .filter(
            BookInventory.book_id == book_id,
            BookInventory.borrowed_by == g,
            BookInventory.status == "checked_out",
        )
        .first()
    )
    if not copy:
        raise HTTPException(status_code=404, detail="No active borrow found for this book.")

    copy.status      = "available"
    copy.due_date    = None
    copy.borrowed_by = None
    copy.updated_at  = datetime.now(timezone.utc)
    db.commit()

    active = (
        db.query(BookInventory)
        .filter(BookInventory.borrowed_by == g, BookInventory.status == "checked_out")
        .count()
    )

    return ReturnResponse(
        success=True,
        message="Book returned successfully! Thank you.",
        active_borrows=active,
    )
