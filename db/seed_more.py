import psycopg2
import requests
import time
import random

DATABASE_URL = "postgresql://neondb_owner:npg_ue2JahjDzk4Z@ep-soft-lab-ap1yvqkr-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"

conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

# ── fetch existing category + shelf maps ──────────────────
cur.execute("SELECT name, id FROM categories;")
category_id_map = dict(cur.fetchall())

cur.execute("SELECT section_name, id FROM shelf_locations;")
shelf_id_map = {}
for section, sid in cur.fetchall():
    shelf_id_map.setdefault(section, []).append(sid)

# ── subjects to fetch (category -> OL subject key) ────────
CATEGORY_SUBJECTS = {
    "Fiction":            "fiction",
    "Mystery & Thriller": "mystery_and_detective_stories",
    "Romance":            "romance",
    "Horror":             "horror",
    "Fantasy":            "fantasy",
    "Science Fiction":    "science_fiction",
    "AI & Data Science":  "artificial_intelligence",
    "Computer Science":   "computer_science",
    "Mathematics":        "mathematics",
    "Physics":            "physics",
    "Biology":            "biology",
    "History":            "history",
    "Biography":          "biography",
    "Philosophy":         "philosophy",
    "Psychology":         "psychology",
    "Self Help":          "self-help",
    "Young Adult":        "young_adult",
    "Children's Books":   "childrens_literature",
    "Cooking":            "cooking",
    "Travel":             "travel",
}

BOOKS_PER_CATEGORY = 150   # 20 categories × 150 = up to 3000 books
OL_PAGE_SIZE       = 50    # Open Library max reliable page size

def fetch_subject_page(subject_key, offset=0, limit=50):
    url = f"https://openlibrary.org/subjects/{subject_key}.json?limit={limit}&offset={offset}"
    try:
        r = requests.get(url, timeout=20)
        r.raise_for_status()
        return r.json().get("works", [])
    except Exception as e:
        print(f"    [warn] {subject_key} offset={offset}: {e}")
        return []

def fetch_all_works(subject_key, target):
    works = []
    offset = 0
    while len(works) < target:
        batch = fetch_subject_page(subject_key, offset=offset, limit=OL_PAGE_SIZE)
        if not batch:
            break
        works.extend(batch)
        offset += len(batch)
        time.sleep(0.3)
    return works[:target]

# ── existing OL IDs so we skip duplicates efficiently ─────
cur.execute("SELECT open_library_id FROM books WHERE open_library_id IS NOT NULL;")
existing_ol_ids = {row[0] for row in cur.fetchall()}

# ── author name cache (skip bio fetch — too slow at scale) ─
author_name_cache = {}   # name -> uuid
cur.execute("SELECT name, id FROM authors;")
for name, aid in cur.fetchall():
    author_name_cache[name] = aid

STATUSES = ["available","available","available","available","checked_out","reserved"]

total_new = 0
print(f"Fetching up to {BOOKS_PER_CATEGORY} books per category ({len(CATEGORY_SUBJECTS)} categories)...\n")

for cat_name, subject_key in CATEGORY_SUBJECTS.items():
    works   = fetch_all_works(subject_key, BOOKS_PER_CATEGORY)
    cat_id  = category_id_map.get(cat_name)
    shelves = shelf_id_map.get(cat_name, [])
    count   = 0

    for w in works:
        title  = (w.get("title") or "").strip()
        ol_id  = w.get("key", "").replace("/works/", "")
        cover  = w.get("cover_id")
        year   = w.get("first_publish_year")
        desc   = w.get("description") or ""
        if isinstance(desc, dict):
            desc = desc.get("value", "")

        if not title or not ol_id or ol_id in existing_ol_ids:
            continue

        cover_url = f"https://covers.openlibrary.org/b/id/{cover}-L.jpg" if cover else None

        cur.execute("""
            INSERT INTO books (title, description, published_year, cover_url, open_library_id)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (open_library_id) DO NOTHING
            RETURNING id;
        """, (title, desc[:2000] or None, year, cover_url, ol_id))
        row = cur.fetchone()
        if not row:
            continue
        book_id = row[0]
        existing_ol_ids.add(ol_id)

        # category link
        if cat_id:
            cur.execute("""
                INSERT INTO book_categories (book_id, category_id)
                VALUES (%s, %s) ON CONFLICT DO NOTHING;
            """, (book_id, cat_id))

        # shelf + inventory
        if shelves:
            shelf_id = random.choice(shelves)
            cur.execute("""
                INSERT INTO book_inventory
                    (book_id, shelf_location_id, copy_number, status, acquired_at)
                VALUES (%s, %s, %s, %s, '2023-06-01')
                ON CONFLICT DO NOTHING;
            """, (book_id, shelf_id, random.randint(1, 5), random.choice(STATUSES)))

        # authors (name only, no extra API call)
        for a in w.get("authors", [])[:4]:
            a_name = (a.get("name") or "").strip()
            if not a_name:
                continue
            if a_name not in author_name_cache:
                cur.execute("""
                    INSERT INTO authors (name)
                    VALUES (%s)
                    ON CONFLICT DO NOTHING
                    RETURNING id;
                """, (a_name,))
                r2 = cur.fetchone()
                if not r2:
                    cur.execute("SELECT id FROM authors WHERE name=%s LIMIT 1;", (a_name,))
                    r2 = cur.fetchone()
                if r2:
                    author_name_cache[a_name] = r2[0]

            if a_name in author_name_cache:
                cur.execute("""
                    INSERT INTO book_authors (book_id, author_id)
                    VALUES (%s, %s) ON CONFLICT DO NOTHING;
                """, (book_id, author_name_cache[a_name]))

        count += 1

    total_new += count
    print(f"  [{cat_name:<22}]  +{count} new books")

# ── final summary ─────────────────────────────────────────
print(f"\nTotal new books added: {total_new}")
print("\n--- Row counts ---")
for t in ["books","authors","book_authors","book_categories","book_inventory","shelf_locations"]:
    cur.execute(f"SELECT COUNT(*) FROM {t};")
    print(f"  {t:<25} {cur.fetchone()[0]:>5}")

cur.execute("SELECT pg_size_pretty(pg_database_size('neondb'));")
print(f"\n  DB size: {cur.fetchone()[0]}")

cur.close()
conn.close()
