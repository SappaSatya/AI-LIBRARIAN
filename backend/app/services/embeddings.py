import os
from openai import OpenAI

_client: OpenAI | None = None

MODEL = "text-embedding-3-small"


def _get_client() -> OpenAI:
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY environment variable is not set")
        _client = OpenAI(api_key=api_key)
    return _client


def embed_text(text: str) -> list[float]:
    response = _get_client().embeddings.create(
        model=MODEL,
        input=text.strip(),
    )
    return response.data[0].embedding


def embed_book(title: str, description: str | None, subjects: list[str]) -> list[float]:
    parts = [f"Title: {title}"]
    if description:
        parts.append(f"Description: {description[:500]}")
    if subjects:
        parts.append(f"Subjects: {', '.join(subjects[:10])}")
    return embed_text(" | ".join(parts))
