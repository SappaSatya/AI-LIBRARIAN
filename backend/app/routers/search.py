from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text

from app.database import get_db
from app.models import Book
from app.schemas import BookSearchResult
from app.services.embeddings import embed_text

router = APIRouter(prefix="/search", tags=["search"])


@router.get("/semantic", response_model=list[BookSearchResult])
def semantic_search(
    q:     str = Query(..., description="Natural language search query"),
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    if not q.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    query_embedding = embed_text(q)

    # pgvector cosine similarity — returns rows sorted by closeness
    rows = db.execute(
        text(
            """
            SELECT id, 1 - (embedding <=> CAST(:emb AS vector)) AS similarity
            FROM books
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> CAST(:emb AS vector)
            LIMIT :limit
            """
        ),
        {"emb": str(query_embedding), "limit": limit},
    ).fetchall()

    if not rows:
        return []

    id_to_similarity = {str(row.id): float(row.similarity) for row in rows}
    book_ids = list(id_to_similarity.keys())

    books = (
        db.query(Book)
        .options(joinedload(Book.authors), joinedload(Book.categories))
        .filter(Book.id.in_(book_ids))
        .all()
    )

    # preserve similarity order
    books.sort(key=lambda b: id_to_similarity.get(str(b.id), 0), reverse=True)

    results = []
    for book in books:
        item = BookSearchResult.model_validate(book)
        item.similarity = id_to_similarity.get(str(book.id))
        results.append(item)

    return results
