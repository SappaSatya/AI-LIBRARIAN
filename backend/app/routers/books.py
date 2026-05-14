from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.database import get_db
from app.models import Book, Category
from app.schemas import BookDetail, BookSummary, PaginatedBooks

router = APIRouter(prefix="/books", tags=["books"])


def _book_query(db: Session):
    return (
        db.query(Book)
        .options(
            joinedload(Book.authors),
            joinedload(Book.categories),
            joinedload(Book.inventory).joinedload("shelf_location"),
        )
    )


@router.get("", response_model=PaginatedBooks)
def list_books(
    category: Optional[str] = Query(None, description="Filter by category name"),
    search:   Optional[str] = Query(None, description="Keyword search on title"),
    page:     int           = Query(1, ge=1),
    limit:    int           = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(Book).options(
        joinedload(Book.authors),
        joinedload(Book.categories),
    )

    if category:
        q = q.join(Book.categories).filter(func.lower(Category.name) == category.lower())

    if search:
        q = q.filter(Book.title.ilike(f"%{search}%"))

    total = q.count()
    items = q.offset((page - 1) * limit).limit(limit).all()

    return PaginatedBooks(total=total, page=page, limit=limit, items=items)


@router.get("/{book_id}", response_model=BookDetail)
def get_book(book_id: UUID, db: Session = Depends(get_db)):
    book = (
        db.query(Book)
        .options(
            joinedload(Book.authors),
            joinedload(Book.categories),
            joinedload(Book.inventory).joinedload("shelf_location"),
        )
        .filter(Book.id == book_id)
        .first()
    )
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book
