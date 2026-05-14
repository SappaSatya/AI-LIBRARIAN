import os, sys, traceback
sys.path.insert(0, "backend")
from dotenv import load_dotenv
load_dotenv("backend/.env")

from app.database import SessionLocal
from app.models import Book, ChatSession, ChatMessage
from app.services.embeddings import embed_text
from app.services.llm import chat_with_books
from sqlalchemy.orm import joinedload
from sqlalchemy import text
import uuid
from datetime import datetime, timezone

db = SessionLocal()
try:
    message = "books on climate change"

    # Step 1: embed
    print("Step 1: embed_text")
    query_embedding = embed_text(message)
    print(f"  OK - {len(query_embedding)} dims")

    # Step 2: vector search
    print("Step 2: vector search")
    rows = db.execute(
        text("""
            SELECT id, 1 - (embedding <=> CAST(:emb AS vector)) AS similarity
            FROM books WHERE embedding IS NOT NULL
            ORDER BY embedding <=> CAST(:emb AS vector) LIMIT 5
        """),
        {"emb": str(query_embedding)},
    ).fetchall()
    print(f"  OK - {len(rows)} books found")

    # Step 3: load full books
    print("Step 3: load books with relationships")
    book_ids = [str(r.id) for r in rows]
    books = (
        db.query(Book)
        .options(
            joinedload(Book.authors),
            joinedload(Book.categories),
            joinedload(Book.inventory).joinedload("shelf_location"),
        )
        .filter(Book.id.in_(book_ids))
        .all()
    )
    print(f"  OK - {len(books)} books loaded")

    # Step 4: LLM
    print("Step 4: chat_with_books LLM call")
    SYSTEM_PROMPT = "You are LibriMind, an AI library assistant at GMU."
    reply, reasons = chat_with_books(
        system=SYSTEM_PROMPT,
        history=[],
        user_message=message,
        books=books,
    )
    print(f"  OK - reply: {reply[:100]}...")

except Exception as e:
    print(f"\nFAILED at step above:")
    traceback.print_exc()
finally:
    db.close()
