"""
Migration: add due_date to book_inventory and seed return dates
for all checked_out copies.
Run once: python db/migrate_due_date.py
"""
import psycopg2
import random
from datetime import date, timedelta
from dotenv import load_dotenv
import os

load_dotenv(os.path.join(os.path.dirname(__file__), "../backend/.env"))
DATABASE_URL = os.getenv("DATABASE_URL")

conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

# 1. Add column (safe — does nothing if it already exists)
cur.execute("""
    ALTER TABLE book_inventory
    ADD COLUMN IF NOT EXISTS due_date DATE;
""")
print("Column due_date ensured.")

# 2. Assign realistic return dates for every checked_out copy
today = date.today()
cur.execute("SELECT id FROM book_inventory WHERE status = 'checked_out'")
rows = cur.fetchall()

for (inv_id,) in rows:
    # Due back somewhere between 1 and 28 days from today
    days_ahead = random.randint(1, 28)
    due = today + timedelta(days=days_ahead)
    cur.execute(
        "UPDATE book_inventory SET due_date = %s WHERE id = %s",
        (due, inv_id),
    )

print(f"Set due_date for {len(rows)} checked-out copies.")
cur.close()
conn.close()
print("Done.")
