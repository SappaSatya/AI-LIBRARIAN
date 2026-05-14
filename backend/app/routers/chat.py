import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import text

from app.database import get_db
from app.models import Book, BookInventory, ShelfLocation, ChatSession, ChatMessage
from app.schemas import ChatRequest, ChatResponse, BookSearchResult
from app.services.embeddings import embed_text
from app.services.llm import chat_with_books

router = APIRouter(prefix="/chat", tags=["chat"])

SYSTEM_PROMPT = """\
You are Library AI, an online library assistant built by Satya Harsha Sappa.
Help users discover books through natural conversation.
When you recommend books, explain briefly WHY each book matches their request.
Be concise, friendly, and helpful in tone.
"""


@router.post("", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    # Resolve or create session
    session = None
    if request.session_id:
        session = db.query(ChatSession).filter(ChatSession.id == request.session_id).first()
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
    else:
        session = ChatSession(
            id=uuid.uuid4(),
            title=request.message[:60],
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(session)
        db.flush()

    # Load conversation history (last 10 messages for context)
    history = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at)
        .limit(10)
        .all()
    )

    # Semantic search to find relevant books
    query_embedding = embed_text(request.message)
    rows = db.execute(
        text(
            """
            SELECT id, 1 - (embedding <=> CAST(:emb AS vector)) AS similarity
            FROM books
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> CAST(:emb AS vector)
            LIMIT 5
            """
        ),
        {"emb": str(query_embedding)},
    ).fetchall()

    relevant_books = []
    if rows:
        book_ids = [str(r.id) for r in rows]
        id_to_sim = {str(r.id): float(r.similarity) for r in rows}

        books = (
            db.query(Book)
            .options(
                joinedload(Book.authors),
                joinedload(Book.categories),
                joinedload(Book.inventory).joinedload(BookInventory.shelf_location),
            )
            .filter(Book.id.in_(book_ids))
            .all()
        )
        books.sort(key=lambda b: id_to_sim.get(str(b.id), 0), reverse=True)
        relevant_books = books

    # Call LLM
    reply, reasons = chat_with_books(
        system=SYSTEM_PROMPT,
        history=[(m.role, m.content) for m in history],
        user_message=request.message,
        books=relevant_books,
    )

    # Persist user message + assistant reply
    now = datetime.now(timezone.utc)
    db.add(ChatMessage(
        id=uuid.uuid4(), session_id=session.id,
        role="user", content=request.message, created_at=now,
    ))
    db.add(ChatMessage(
        id=uuid.uuid4(), session_id=session.id,
        role="assistant", content=reply, created_at=now,
    ))
    db.commit()

    # Build book results with per-book reasons from LLM
    book_results = []
    for i, book in enumerate(relevant_books):
        item = BookSearchResult.model_validate(book)
        item.reason = reasons[i] if i < len(reasons) else None
        book_results.append(item)

    return ChatResponse(reply=reply, session_id=session.id, books=book_results)
