import psycopg2
import requests
import time
import random

DATABASE_URL = "postgresql://neondb_owner:npg_ue2JahjDzk4Z@ep-soft-lab-ap1yvqkr-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"

conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

# ─────────────────────────────────────────────────────────
# 1. SHELF LOCATIONS  (imaginary 4-floor library)
# ─────────────────────────────────────────────────────────
SHELVES = [
    # (floor, section_name, shelf_code, description)
    # Floor 1 — Fiction & Literature
    (1, "Fiction",           "A01", "Classic and contemporary fiction"),
    (1, "Fiction",           "A02", "Award-winning novels"),
    (1, "Fiction",           "A03", "International fiction"),
    (1, "Mystery & Thriller","B01", "Crime, detective and thriller novels"),
    (1, "Mystery & Thriller","B02", "Psychological thrillers"),
    (1, "Romance",           "C01", "Contemporary romance"),
    (1, "Romance",           "C02", "Historical romance"),
    (1, "Horror",            "D01", "Horror and dark fiction"),
    (1, "Fantasy",           "E01", "Epic and high fantasy"),
    (1, "Fantasy",           "E02", "Urban and modern fantasy"),
    (1, "Science Fiction",   "F01", "Classic sci-fi"),
    (1, "Science Fiction",   "F02", "Contemporary science fiction"),

    # Floor 2 — Science & Technology
    (2, "AI & Data Science", "G01", "Artificial intelligence and ML books"),
    (2, "AI & Data Science", "G02", "Deep learning and neural networks"),
    (2, "Computer Science",  "H01", "Programming and software engineering"),
    (2, "Computer Science",  "H02", "Algorithms and data structures"),
    (2, "Mathematics",       "I01", "Pure and applied mathematics"),
    (2, "Mathematics",       "I02", "Statistics and probability"),
    (2, "Physics",           "J01", "Theoretical and applied physics"),
    (2, "Biology",           "K01", "Life sciences and genetics"),
    (2, "Chemistry",         "L01", "Chemistry and biochemistry"),
    (2, "Engineering",       "M01", "Mechanical and electrical engineering"),

    # Floor 3 — History, Society & Humanities
    (3, "History",           "N01", "World history"),
    (3, "History",           "N02", "Ancient civilizations"),
    (3, "History",           "N03", "Modern history and wars"),
    (3, "Biography",         "O01", "Leaders and politicians"),
    (3, "Biography",         "O02", "Scientists and innovators"),
    (3, "Philosophy",        "P01", "Western philosophy"),
    (3, "Philosophy",        "P02", "Eastern philosophy"),
    (3, "Psychology",        "Q01", "Human behavior and cognition"),
    (3, "Sociology",         "R01", "Society, culture and anthropology"),
    (3, "Economics",         "S01", "Macroeconomics and finance"),

    # Floor 4 — Lifestyle, Kids & Reference
    (4, "Self Help",         "T01", "Personal development and motivation"),
    (4, "Self Help",         "T02", "Productivity and habits"),
    (4, "Health & Wellness", "U01", "Nutrition, fitness and mental health"),
    (4, "Children's Books",  "V01", "Picture books and early readers"),
    (4, "Children's Books",  "V02", "Middle grade fiction"),
    (4, "Young Adult",       "W01", "Young adult fiction"),
    (4, "Young Adult",       "W02", "Young adult non-fiction"),
    (4, "Travel",            "X01", "Travel guides and memoirs"),
    (4, "Cooking",           "Y01", "Recipes and culinary arts"),
    (4, "Art & Design",      "Z01", "Visual arts, design and architecture"),
]

print("Seeding shelf locations...")
shelf_id_map = {}  # section_name -> list of shelf UUIDs

for floor, section, code, desc in SHELVES:
    cur.execute("""
        INSERT INTO shelf_locations (floor_number, section_name, shelf_code, description)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (floor_number, shelf_code) DO NOTHING
        RETURNING id;
    """, (floor, section, code, desc))
    row = cur.fetchone()
    if row:
        sid = row[0]
        shelf_id_map.setdefault(section, []).append(sid)

print(f"  -> {len(SHELVES)} shelf locations seeded across 4 floors.\n")

# ─────────────────────────────────────────────────────────
# 2. CATEGORIES
# ─────────────────────────────────────────────────────────
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

print("Seeding categories...")
category_id_map = {}

for cat_name in CATEGORY_SUBJECTS:
    cur.execute("""
        INSERT INTO categories (name)
        VALUES (%s)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id;
    """, (cat_name,))
    category_id_map[cat_name] = cur.fetchone()[0]

print(f"  -> {len(category_id_map)} categories seeded.\n")

# ─────────────────────────────────────────────────────────
# 3. FETCH BOOKS from Open Library
# ─────────────────────────────────────────────────────────
def fetch_books(subject_key, limit=15):
    url = f"https://openlibrary.org/subjects/{subject_key}.json?limit={limit}"
    try:
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        return r.json().get("works", [])
    except Exception as e:
        print(f"    [warn] {subject_key}: {e}")
        return []

def fetch_author_bio(author_key):
    try:
        r = requests.get(f"https://openlibrary.org{author_key}.json", timeout=10)
        data = r.json()
        bio = data.get("bio", "")
        if isinstance(bio, dict):
            bio = bio.get("value", "")
        birth = data.get("birth_date", "")
        death = data.get("death_date", "")
        birth_year = int(birth[:4]) if birth and birth[:4].isdigit() else None
        death_year = int(death[:4]) if death and death[:4].isdigit() else None
        return bio[:1000] if bio else None, birth_year, death_year
    except:
        return None, None, None

total_books = 0
author_cache = {}  # ol_key -> uuid

print("Fetching books from Open Library...\n")

for cat_name, subject_key in CATEGORY_SUBJECTS.items():
    works = fetch_books(subject_key, limit=15)
    if not works:
        continue

    cat_id    = category_id_map[cat_name]
    shelves   = shelf_id_map.get(cat_name, [])
    count     = 0

    for w in works:
        title   = w.get("title", "").strip()
        ol_id   = w.get("key", "").replace("/works/", "")
        cover   = w.get("cover_id")
        cover_url = f"https://covers.openlibrary.org/b/id/{cover}-L.jpg" if cover else None
        year    = w.get("first_publish_year")
        desc    = w.get("description") or ""
        if isinstance(desc, dict):
            desc = desc.get("value", "")

        if not title or not ol_id:
            continue

        # Insert book
        cur.execute("""
            INSERT INTO books
                (title, description, published_year, cover_url, open_library_id)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (open_library_id) DO NOTHING
            RETURNING id;
        """, (title, desc[:2000] or None, year, cover_url, ol_id))
        row = cur.fetchone()
        if not row:
            continue
        book_id = row[0]

        # Link category
        cur.execute("""
            INSERT INTO book_categories (book_id, category_id)
            VALUES (%s, %s) ON CONFLICT DO NOTHING;
        """, (book_id, cat_id))

        # Link to a shelf
        if shelves:
            shelf_id = random.choice(shelves)
            copy_num = random.randint(1, 4)
            status   = random.choice(["available","available","available","checked_out","reserved"])
            cur.execute("""
                INSERT INTO book_inventory
                    (book_id, shelf_location_id, copy_number, status, acquired_at)
                VALUES (%s, %s, %s, %s, '2023-01-01')
                ON CONFLICT DO NOTHING;
            """, (book_id, shelf_id, copy_num, status))

        # Authors
        for a in w.get("authors", [])[:3]:
            a_name = a.get("name", "").strip()
            a_key  = a.get("key", "")
            if not a_name:
                continue

            if a_key not in author_cache:
                bio, by, dy = fetch_author_bio(a_key)
                cur.execute("""
                    INSERT INTO authors (name, bio, birth_year, death_year)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT DO NOTHING
                    RETURNING id;
                """, (a_name, bio, by, dy))
                row2 = cur.fetchone()
                if not row2:
                    cur.execute("SELECT id FROM authors WHERE name = %s LIMIT 1;", (a_name,))
                    row2 = cur.fetchone()
                if row2:
                    author_cache[a_key] = row2[0]

            if a_key in author_cache:
                cur.execute("""
                    INSERT INTO book_authors (book_id, author_id)
                    VALUES (%s, %s) ON CONFLICT DO NOTHING;
                """, (book_id, author_cache[a_key]))

        count += 1
        time.sleep(0.05)

    total_books += count
    print(f"  [{cat_name}]  {count} books")

print(f"\nDone. Total books inserted: {total_books}")

# ─────────────────────────────────────────────────────────
# 4. SUMMARY
# ─────────────────────────────────────────────────────────
print("\n--- Final row counts ---")
for t in ["shelf_locations","categories","books","authors","book_authors",
          "book_categories","book_inventory"]:
    cur.execute(f"SELECT COUNT(*) FROM {t};")
    print(f"  {t:<22} {cur.fetchone()[0]:>5}")

cur.close()
conn.close()
