import os
import json
from openai import OpenAI

_client: OpenAI | None = None
MODEL = "gpt-4o"


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY environment variable is not set")
        _client = OpenAI(api_key=api_key)
    return _client


def _format_book_context(books) -> str:
    lines = []
    for i, book in enumerate(books, 1):
        authors = ", ".join(a.name for a in book.authors) or "Unknown"
        categories = ", ".join(c.name for c in book.categories) or "General"
        shelf = ""
        for inv in book.inventory:
            if inv.shelf_location:
                sl = inv.shelf_location
                shelf = f"Floor {sl.floor_number}, {sl.section_name}, Shelf {sl.shelf_code}"
                break
        status = book.inventory[0].status if book.inventory else "unknown"
        lines.append(
            f"{i}. \"{book.title}\" by {authors} ({book.published_year or 'n/a'})"
            f"\n   Category: {categories}"
            f"\n   Location: {shelf or 'unknown'} | Status: {status}"
            f"\n   Description: {(book.description or '')[:200]}"
        )
    return "\n\n".join(lines)


def chat_with_books(
    system: str,
    history: list[tuple[str, str]],
    user_message: str,
    books: list,
) -> tuple[str, list[str]]:
    """
    Returns (assistant_reply, list_of_per_book_reasons).
    Reasons are extracted from a structured JSON block appended by the LLM.
    """
    messages = [{"role": "system", "content": system}]

    for role, content in history:
        messages.append({"role": role, "content": content})

    book_context = _format_book_context(books) if books else "No relevant books found in the library."

    augmented_message = (
        f"{user_message}\n\n"
        f"--- Relevant books from the online library ---\n{book_context}\n\n"
        "After your conversational reply, output a JSON block on its own line like:\n"
        '```reasons\n["reason for book 1", "reason for book 2", ...]\n```\n'
        "One short reason per book (same order). Omit if no books."
    )
    messages.append({"role": "user", "content": augmented_message})

    response = _get_client().chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.7,
        max_tokens=1000,
    )

    full_reply = response.choices[0].message.content or ""

    # Split out the reasons block
    reasons: list[str] = []
    reply_text = full_reply
    if "```reasons" in full_reply:
        parts = full_reply.split("```reasons", 1)
        reply_text = parts[0].strip()
        json_part = parts[1].split("```", 1)[0].strip()
        try:
            reasons = json.loads(json_part)
        except (json.JSONDecodeError, ValueError):
            reasons = []

    return reply_text, reasons
