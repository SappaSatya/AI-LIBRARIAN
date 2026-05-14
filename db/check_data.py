import psycopg2

DATABASE_URL = "postgresql://neondb_owner:npg_ue2JahjDzk4Z@ep-soft-lab-ap1yvqkr-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"

conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()

tables = [
    "books", "authors", "book_authors", "categories", "book_categories",
    "shelf_locations", "book_inventory", "users", "user_preferences",
    "chat_sessions", "chat_messages", "recommendations", "search_logs"
]

print(f"{'Table':<22} {'Rows':>6}")
print("-" * 30)
total = 0
for t in tables:
    cur.execute(f"SELECT COUNT(*) FROM {t};")
    count = cur.fetchone()[0]
    total += count
    print(f"{t:<22} {count:>6}")

print("-" * 30)
print(f"{'TOTAL':<22} {total:>6}")

cur.close()
conn.close()
