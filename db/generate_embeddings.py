"""
Generate OpenAI embeddings for all books in the LibriMind database.

Usage:
    python db/generate_embeddings.py              # embed all books missing embeddings
    python db/generate_embeddings.py --limit 20   # test run on 20 books
    python db/generate_embeddings.py --reset       # clear all embeddings first, then run

Looks for credentials in backend/.env, then falls back to environment variables.
"""

import os
import sys
import time
import argparse
import psycopg2
import numpy as np
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI, RateLimitError, APIError

# ── Load env ────────────────────────────────────────────────────────────────
# Try backend/.env relative to this script's location
script_dir = Path(__file__).parent
env_candidates = [
    script_dir.parent / "backend" / ".env",
    script_dir.parent / ".env",
    script_dir / ".env",
]
for env_path in env_candidates:
    if env_path.exists():
        load_dotenv(env_path)
        print(f"Loaded env from {env_path}")
        break

DATABASE_URL  = os.getenv("DATABASE_URL")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not DATABASE_URL:
    sys.exit("ERROR: DATABASE_URL not set. Add it to backend/.env")
if not OPENAI_API_KEY:
    sys.exit("ERROR: OPENAI_API_KEY not set. Add it to backend/.env")

# ── Config ───────────────────────────────────────────────────────────────────
EMBED_MODEL  = "text-embedding-3-small"
BATCH_SIZE   = 100   # books per OpenAI API call (max 2048, keeping low for safety)
MAX_RETRIES  = 5
RETRY_DELAY  = 10    # seconds between rate-limit retries

# ── Helpers ──────────────────────────────────────────────────────────────────

def build_embed_text(title: str, description: str | None, categories: list[str]) -> str:
    parts = [f"Title: {title}"]
    if description:
        parts.append(f"Description: {description[:500]}")
    if categories:
        parts.append(f"Subjects: {', '.join(categories[:10])}")
    return " | ".join(parts)


def embed_batch(client: OpenAI, texts: list[str]) -> list[list[float]]:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = client.embeddings.create(model=EMBED_MODEL, input=texts)
            return [item.embedding for item in response.data]
        except RateLimitError:
            if attempt == MAX_RETRIES:
                raise
            wait = RETRY_DELAY * attempt
            print(f"  Rate limit hit — waiting {wait}s (attempt {attempt}/{MAX_RETRIES})")
            time.sleep(wait)
        except APIError as e:
            if attempt == MAX_RETRIES:
                raise
            print(f"  API error: {e} — retrying in {RETRY_DELAY}s")
            time.sleep(RETRY_DELAY)


def progress(done: int, total: int, bar_width: int = 40):
    pct   = done / total if total else 0
    filled = int(bar_width * pct)
    bar   = "#" * filled + "-" * (bar_width - filled)
    print(f"\r  [{bar}] {done}/{total} ({pct:.1%})", end="", flush=True)


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Generate book embeddings")
    parser.add_argument("--limit", type=int, default=None, help="Process at most N books (for testing)")
    parser.add_argument("--reset", action="store_true", help="Clear all existing embeddings before running")
    args = parser.parse_args()

    client = OpenAI(api_key=OPENAI_API_KEY)

    # pgvector psycopg2 adapter
    try:
        from pgvector.psycopg2 import register_vector
    except ImportError:
        sys.exit("ERROR: pgvector package not installed. Run: pip install pgvector")

    def connect():
        c = psycopg2.connect(DATABASE_URL)
        register_vector(c)
        return c, c.cursor()

    conn, cur = connect()

    if args.reset:
        print("Clearing all existing embeddings...")
        cur.execute("UPDATE books SET embedding = NULL")
        conn.commit()
        print("Done.\n")

    # Fetch books without embeddings, along with their category names
    cur.execute(
        """
        SELECT
            b.id,
            b.title,
            b.description,
            COALESCE(
                array_agg(c.name ORDER BY c.name) FILTER (WHERE c.name IS NOT NULL),
                '{}'
            ) AS categories
        FROM books b
        LEFT JOIN book_categories bc ON b.id = bc.book_id
        LEFT JOIN categories c       ON bc.category_id = c.id
        WHERE b.embedding IS NULL
        GROUP BY b.id, b.title, b.description
        ORDER BY b.created_at
        """
        + (f" LIMIT {args.limit}" if args.limit else "")
    )
    rows = cur.fetchall()

    total = len(rows)
    if total == 0:
        print("All books already have embeddings. Nothing to do.")
        conn.close()
        return

    print(f"Found {total} books without embeddings.")
    print(f"Model: {EMBED_MODEL}  |  Batch size: {BATCH_SIZE}")
    print(f"Estimated API calls: {-(-total // BATCH_SIZE)}\n")  # ceiling division

    done         = 0
    failed_ids   = []
    start_time   = time.time()

    for batch_start in range(0, total, BATCH_SIZE):
        batch = rows[batch_start : batch_start + BATCH_SIZE]

        ids   = [r[0] for r in batch]
        texts = [build_embed_text(r[1], r[2], r[3]) for r in batch]

        try:
            embeddings = embed_batch(client, texts)
        except Exception as e:
            print(f"\n  BATCH FAILED (books {batch_start}-{batch_start+len(batch)}): {e}")
            failed_ids.extend(ids)
            done += len(batch)
            progress(done, total)
            continue

        # Bulk update — reconnect if Neon dropped the connection
        update_data = [
            (np.array(emb, dtype=np.float32), str(book_id))
            for emb, book_id in zip(embeddings, ids)
        ]
        for attempt in range(1, MAX_RETRIES + 1):
            try:
                cur.executemany(
                    "UPDATE books SET embedding = %s, updated_at = NOW() WHERE id = %s::uuid",
                    update_data,
                )
                conn.commit()
                break
            except psycopg2.OperationalError as e:
                if attempt == MAX_RETRIES:
                    raise
                print(f"\n  DB connection lost — reconnecting (attempt {attempt}/{MAX_RETRIES})...")
                try:
                    conn.close()
                except Exception:
                    pass
                time.sleep(RETRY_DELAY)
                conn, cur = connect()

        done += len(batch)
        progress(done, total)

        # Polite pause between batches to avoid hammering the API
        if batch_start + BATCH_SIZE < total:
            time.sleep(0.5)

    elapsed = time.time() - start_time
    print(f"\n\nDone in {elapsed:.1f}s")
    print(f"  Embedded:  {done - len(failed_ids)}/{total}")

    if failed_ids:
        print(f"  Failed:    {len(failed_ids)} books")
        print("  Failed IDs:", failed_ids[:10], "..." if len(failed_ids) > 10 else "")
    else:
        print("  All embeddings saved successfully.")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
