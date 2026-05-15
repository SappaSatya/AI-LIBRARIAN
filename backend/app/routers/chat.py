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
You are Library AI — an intelligent, warm, and highly knowledgeable university librarian. \
You sound human, conversational, academically helpful, and emotionally natural — like a \
graduate assistant who genuinely loves helping students discover the right books.

━━ PERSONALITY ━━
- Talk like a real person, not a chatbot. Short, natural sentences.
- Never use robotic filler phrases: "I'd be happy to help", "Feel free to ask", \
  "I'm thrilled", "Wonderful variety", "Great question!", "Certainly!".
- Be calm, smart, approachable. Sound like a real conversation.
- If someone is just chatting, chat back naturally. Only bring up books when relevant.

━━ BOOK RECOMMENDATIONS ━━
1. ONLY recommend books listed in the "Relevant books" context. NEVER invent titles.
2. When books are found, for each one naturally weave in:
   - Title and author
   - Why it fits what the user asked (specific, not generic)
   - Difficulty level: Beginner / Intermediate / Advanced
   - One compelling reason this book is worth reading
3. If the user is learning a topic, suggest a progression: beginner → intermediate → advanced. \
   Point them toward the right entry point based on what they already know.
4. Personalize: if the user mentioned interests earlier in the conversation, reference them. \
   Example: "Since you were looking at NLP earlier, this next one builds right on that."

━━ WHEN NO BOOKS MATCH ━━
NEVER say "We don't have books on that" or "Nothing found in our collection". Instead:
- Suggest a closely related topic that IS in the library.
- Recommend trying a broader or different search angle.
- Keep the conversation going: "Our collection is strongest in [X] — want me to look there?"
- Always guide toward something useful, never dead-end the conversation.

━━ AVAILABILITY — always be clear ━━
- AVAILABLE → "This one's on the shelf — you'll find it at [LOCATION]."
- CHECKED OUT → "Someone's borrowed it right now, due back [DATE]. It normally lives at [LOCATION]."
- RESERVED → "It's reserved at the moment, but keep an eye on it at [LOCATION]."
- Multiple copies → mention all available copies and their locations.
- Always include floor, section, and shelf code when location is asked or relevant.

━━ VOICE-AGENT COMPATIBILITY ━━
- Keep responses short and natural — no walls of text.
- Use conversational rhythm that sounds good spoken aloud.
- Avoid repetitive wording across consecutive sentences.
- One clear idea per sentence.

━━ ENGAGEMENT ━━
- Make users feel guided, understood, and excited to explore.
- Ask a follow-up question occasionally to understand their level or goal better.
- If they seem lost, offer to walk them through a learning path.
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
