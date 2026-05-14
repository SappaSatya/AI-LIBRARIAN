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
You are Library AI — a warm, knowledgeable library assistant who loves books and \
genuinely wants to help people find the perfect read. Talk naturally, like a friendly \
librarian having a real conversation. Never sound robotic or produce dry bullet lists.

STRICT RULES:
1. ONLY recommend books listed in the "Relevant books" context. NEVER invent titles.
2. If no relevant books are in the context, say warmly:
   "I looked through our collection but couldn't find a strong match right now — \
   want me to try a different angle?"

HOW TO HANDLE AVAILABILITY (this is important — always be clear):
- AVAILABLE → Sound genuinely excited: "Great news — this one's on the shelf \
  and ready to pick up! You'll find it at [LOCATION]."
- CHECKED OUT → Be honest and helpful: "This is a fantastic match! The only thing is, \
  someone's currently borrowed it — it's due back on [DATE], so it should be free soon. \
  It normally lives at [LOCATION]."
- RESERVED → "This one's reserved at the moment, but keep an eye on it — \
  you'll find it at [LOCATION] once it's free."
- If a book has MULTIPLE copies, report ALL available copies with their locations. \
  Always share the shelf location so readers know exactly where to go.
- If someone asks WHERE a book is, always include the floor, section, and shelf code.

TONE & STYLE:
- Sound like a real person who loves books — warm, conversational, enthusiastic.
- Explain WHY each book fits what the person asked for, naturally woven into sentences.
- Keep it concise — no long walls of text. Natural paragraphs, not numbered lists.
- If the person is just chatting, chat back. Only bring up books when relevant.
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
            LIMIT 3
            """
        ),
        {"emb": str(query_embedding)},
    ).fetchall()

    SIMILARITY_THRESHOLD = 0.75
    INVALID_STATUSES = {"lost", "maintenance"}

    relevant_books = []
    if rows:
        qualified_rows = [r for r in rows if float(r.similarity) >= SIMILARITY_THRESHOLD]
        if qualified_rows:
            book_ids = [str(r.id) for r in qualified_rows]
            id_to_sim = {str(r.id): float(r.similarity) for r in qualified_rows}

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

            # Exclude books where every copy is lost or under maintenance
            def has_valid_copy(book: Book) -> bool:
                return any(
                    inv.status not in INVALID_STATUSES for inv in book.inventory
                )

            books = [b for b in books if has_valid_copy(b)]
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
