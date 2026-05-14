import psycopg2
import os

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://neondb_owner:npg_ue2JahjDzk4Z@ep-soft-lab-ap1yvqkr-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"
)

schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")

with open(schema_path, "r") as f:
    sql = f.read()

conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

print("Running schema...")
cur.execute(sql)
print("Schema applied successfully.")

cur.execute("""
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name;
""")
tables = [row[0] for row in cur.fetchall()]
print(f"\nTables created ({len(tables)}):")
for t in tables:
    print(f"  - {t}")

cur.close()
conn.close()
