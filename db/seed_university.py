"""
LibriMind AI — GMU Fairfax University Library Seed
Clears old non-academic data, sets up university shelves,
and loads ~5000 academic books from Open Library.
"""
import psycopg2
import requests
import time
import random

DATABASE_URL = "postgresql://neondb_owner:npg_ue2JahjDzk4Z@ep-soft-lab-ap1yvqkr-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"

conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

# ─────────────────────────────────────────────────────────
# 1.  WIPE OLD DATA  (keep table structure)
# ─────────────────────────────────────────────────────────
print("Clearing old data...")
cur.execute("""
    TRUNCATE book_inventory, book_authors, book_categories,
             recommendations, search_logs, chat_messages,
             chat_sessions, user_preferences,
             books, authors, categories, shelf_locations
    RESTART IDENTITY CASCADE;
""")
print("  -> Done.\n")

# ─────────────────────────────────────────────────────────
# 2.  UNIVERSITY SHELF LOCATIONS  (GMU-style 5-floor layout)
# ─────────────────────────────────────────────────────────
SHELVES = [
    # Floor 1 — Mathematics & Computing
    (1, "Mathematics",           "M01", "Calculus, Analysis and Real Analysis"),
    (1, "Mathematics",           "M02", "Linear Algebra and Abstract Algebra"),
    (1, "Mathematics",           "M03", "Discrete Mathematics and Graph Theory"),
    (1, "Mathematics",           "M04", "Probability, Statistics and Stochastic Processes"),
    (1, "Mathematics",           "M05", "Differential Equations and Numerical Methods"),
    (1, "Computer Science",      "C01", "Algorithms and Data Structures"),
    (1, "Computer Science",      "C02", "Programming Languages and Compilers"),
    (1, "Computer Science",      "C03", "Operating Systems and Computer Architecture"),
    (1, "Computer Science",      "C04", "Databases and Information Systems"),
    (1, "Computer Science",      "C05", "Software Engineering and Design Patterns"),
    (1, "Cybersecurity",         "CY01","Network Security and Cryptography"),
    (1, "Cybersecurity",         "CY02","Ethical Hacking and Penetration Testing"),
    (1, "Artificial Intelligence","AI01","Machine Learning and Deep Learning"),
    (1, "Artificial Intelligence","AI02","Natural Language Processing and Computer Vision"),
    (1, "Data Science",          "DS01","Data Analysis, Visualization and Big Data"),

    # Floor 2 — Physical Sciences
    (2, "Physics",               "P01", "Classical Mechanics and Thermodynamics"),
    (2, "Physics",               "P02", "Electromagnetism and Optics"),
    (2, "Physics",               "P03", "Quantum Physics and Quantum Mechanics"),
    (2, "Physics",               "P04", "Relativity, Astrophysics and Cosmology"),
    (2, "Physics",               "P05", "Condensed Matter and Solid State Physics"),
    (2, "Chemistry",             "CH01","General and Inorganic Chemistry"),
    (2, "Chemistry",             "CH02","Organic Chemistry and Reaction Mechanisms"),
    (2, "Chemistry",             "CH03","Physical Chemistry and Thermodynamics"),
    (2, "Chemistry",             "CH04","Analytical Chemistry and Spectroscopy"),
    (2, "Chemistry",             "CH05","Biochemistry and Molecular Chemistry"),
    (2, "Environmental Science", "EN01","Environmental Studies and Ecology"),
    (2, "Environmental Science", "EN02","Climate Science and Sustainability"),

    # Floor 3 — Engineering
    (3, "Mechanical Engineering","ME01","Mechanics of Materials and Solid Mechanics"),
    (3, "Mechanical Engineering","ME02","Fluid Mechanics and Heat Transfer"),
    (3, "Mechanical Engineering","ME03","Machine Design and Manufacturing"),
    (3, "Mechanical Engineering","ME04","Thermodynamics and Energy Systems"),
    (3, "Aerospace Engineering", "AE01","Aerodynamics and Flight Mechanics"),
    (3, "Aerospace Engineering", "AE02","Propulsion and Rocket Science"),
    (3, "Aerospace Engineering", "AE03","Spacecraft Design and Orbital Mechanics"),
    (3, "Electrical Engineering","EE01","Circuits, Electronics and Signal Processing"),
    (3, "Electrical Engineering","EE02","Control Systems and Robotics"),
    (3, "Electrical Engineering","EE03","Telecommunications and Wireless Systems"),
    (3, "Civil Engineering",     "CV01","Structural Engineering and Construction"),
    (3, "Civil Engineering",     "CV02","Geotechnical and Transportation Engineering"),
    (3, "Bioengineering",        "BE01","Biomedical Engineering and Biomaterials"),

    # Floor 4 — Life Sciences & Health
    (4, "Biology",               "B01", "Cell Biology and Molecular Biology"),
    (4, "Biology",               "B02", "Genetics and Genomics"),
    (4, "Biology",               "B03", "Microbiology and Virology"),
    (4, "Biology",               "B04", "Ecology, Evolution and Zoology"),
    (4, "Neuroscience",          "NS01","Cognitive Neuroscience and Brain Science"),
    (4, "Neuroscience",          "NS02","Neuroanatomy and Neurophysiology"),
    (4, "Psychology",            "PY01","Cognitive and Experimental Psychology"),
    (4, "Psychology",            "PY02","Clinical Psychology and Behavioral Science"),
    (4, "Public Health",         "PH01","Epidemiology and Global Health"),

    # Floor 5 — Humanities, Social Sciences & Reference
    (5, "English & Writing",     "EW01","Academic Writing and Composition"),
    (5, "English & Writing",     "EW02","English Literature and Literary Theory"),
    (5, "English & Writing",     "EW03","Linguistics and Applied Linguistics"),
    (5, "Economics",             "EC01","Microeconomics and Macroeconomics"),
    (5, "Economics",             "EC02","Econometrics and Financial Economics"),
    (5, "Political Science",     "PS01","American Government and Public Policy"),
    (5, "Political Science",     "PS02","International Relations and Diplomacy"),
    (5, "History",               "HI01","American History and US Government"),
    (5, "History",               "HI02","World History and Global Studies"),
    (5, "Philosophy",            "PH01","Logic, Ethics and Philosophy of Science"),
    (5, "Business",              "BU01","Management, Strategy and Entrepreneurship"),
    (5, "Business",              "BU02","Finance, Accounting and Operations"),
    (5, "Law",                   "LW01","Constitutional Law and Legal Studies"),
    (5, "Research Methods",      "RM01","Research Design, Statistics and Academic Skills"),
]

print("Seeding university shelf locations...")
shelf_id_map = {}
for floor, section, code, desc in SHELVES:
    cur.execute("""
        INSERT INTO shelf_locations (floor_number, section_name, shelf_code, description)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (floor_number, shelf_code) DO NOTHING
        RETURNING id;
    """, (floor, section, code, desc))
    row = cur.fetchone()
    if row:
        shelf_id_map.setdefault(section, []).append(row[0])
print(f"  -> {len(SHELVES)} shelves across 5 floors.\n")

# ─────────────────────────────────────────────────────────
# 3.  CATEGORIES  (university academic subjects)
# ─────────────────────────────────────────────────────────
CATEGORY_SUBJECTS = {
    # Mathematics
    "Mathematics":            ["mathematics", "calculus", "algebra", "statistics", "differential_equations"],
    # Computer Science
    "Computer Science":       ["computer_science", "computer_programming", "computer_algorithms", "software_engineering"],
    # Cybersecurity
    "Cybersecurity":          ["computer_security", "cryptography", "network_security"],
    # AI & ML
    "Artificial Intelligence":["artificial_intelligence", "machine_learning", "neural_networks"],
    # Data Science
    "Data Science":           ["data_analysis", "statistics", "data_mining"],
    # Physics
    "Physics":                ["physics", "quantum_physics", "thermodynamics", "astrophysics", "electromagnetism"],
    # Chemistry
    "Chemistry":              ["chemistry", "organic_chemistry", "physical_chemistry", "biochemistry", "analytical_chemistry"],
    # Environmental Science
    "Environmental Science":  ["environmental_science", "ecology", "climate_change"],
    # Mechanical Engineering
    "Mechanical Engineering": ["mechanical_engineering", "fluid_mechanics", "thermodynamics", "materials_science"],
    # Aerospace Engineering
    "Aerospace Engineering":  ["aeronautics", "aerospace_engineering", "rocket_propulsion", "orbital_mechanics"],
    # Electrical Engineering
    "Electrical Engineering": ["electrical_engineering", "electronics", "signal_processing", "control_theory"],
    # Civil Engineering
    "Civil Engineering":      ["civil_engineering", "structural_engineering", "geotechnical_engineering"],
    # Bioengineering
    "Bioengineering":         ["biomedical_engineering", "biomaterials", "tissue_engineering"],
    # Biology
    "Biology":                ["biology", "molecular_biology", "genetics", "microbiology", "cell_biology"],
    # Neuroscience
    "Neuroscience":           ["neuroscience", "cognitive_science", "neuroanatomy"],
    # Psychology
    "Psychology":             ["psychology", "cognitive_psychology", "behavioral_psychology"],
    # English & Writing
    "English & Writing":      ["academic_writing", "english_literature", "linguistics", "composition"],
    # Economics
    "Economics":              ["economics", "microeconomics", "macroeconomics", "econometrics"],
    # Political Science
    "Political Science":      ["political_science", "international_relations", "public_policy", "american_government"],
    # History
    "History":                ["american_history", "world_history", "history_of_science", "military_history"],
    # Philosophy
    "Philosophy":             ["philosophy", "logic", "ethics", "philosophy_of_science"],
    # Business
    "Business":               ["business_management", "finance", "entrepreneurship", "accounting"],
    # Law
    "Law":                    ["law", "constitutional_law", "international_law"],
    # Research Methods
    "Research Methods":       ["research_methods", "scientific_method", "experimental_design"],
    # Public Health
    "Public Health":          ["public_health", "epidemiology", "global_health"],
}

TARGET_PER_SUBJECT = 30   # 30 books per OL subject key
# total capacity: 25 categories × ~3-5 subjects × 30 = ~3750-5000

print("Seeding categories...")
category_id_map = {}
for cat_name in CATEGORY_SUBJECTS:
    cur.execute("""
        INSERT INTO categories (name) VALUES (%s)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id;
    """, (cat_name,))
    category_id_map[cat_name] = cur.fetchone()[0]
print(f"  -> {len(category_id_map)} categories.\n")

# ─────────────────────────────────────────────────────────
# 4.  FETCH BOOKS
# ─────────────────────────────────────────────────────────
def fetch_works(subject_key, limit=30, offset=0):
    url = f"https://openlibrary.org/subjects/{subject_key}.json?limit={limit}&offset={offset}"
    try:
        r = requests.get(url, timeout=20)
        r.raise_for_status()
        return r.json().get("works", [])
    except Exception as e:
        print(f"      [warn] {subject_key}: {e}")
        return []

existing_ol = set()
cur.execute("SELECT open_library_id FROM books WHERE open_library_id IS NOT NULL;")
for row in cur.fetchall():
    existing_ol.add(row[0])

author_cache = {}
STATUSES = ["available","available","available","available","checked_out","reserved","reserved"]

grand_total = 0
print("Fetching university books from Open Library...\n")

for cat_name, subject_keys in CATEGORY_SUBJECTS.items():
    cat_id  = category_id_map[cat_name]
    shelves = shelf_id_map.get(cat_name, [])
    cat_count = 0

    for subj in subject_keys:
        works = fetch_works(subj, limit=TARGET_PER_SUBJECT)
        time.sleep(0.3)

        for w in works:
            title  = (w.get("title") or "").strip()
            ol_id  = w.get("key", "").replace("/works/", "")
            cover  = w.get("cover_id")
            year   = w.get("first_publish_year")
            desc   = w.get("description") or ""
            if isinstance(desc, dict):
                desc = desc.get("value", "")
            subject_tags = w.get("subject", [])[:10]

            if not title or not ol_id or ol_id in existing_ol:
                continue

            cover_url = f"https://covers.openlibrary.org/b/id/{cover}-L.jpg" if cover else None

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
            existing_ol.add(ol_id)

            # category
            cur.execute("INSERT INTO book_categories VALUES (%s,%s) ON CONFLICT DO NOTHING;",
                        (book_id, cat_id))

            # shelf + inventory
            if shelves:
                cur.execute("""
                    INSERT INTO book_inventory
                        (book_id, shelf_location_id, copy_number, status, acquired_at)
                    VALUES (%s, %s, %s, %s, '2024-01-01')
                    ON CONFLICT DO NOTHING;
                """, (book_id, random.choice(shelves), random.randint(1,4), random.choice(STATUSES)))

            # authors
            for a in w.get("authors", [])[:3]:
                a_name = (a.get("name") or "").strip()
                if not a_name:
                    continue
                if a_name not in author_cache:
                    cur.execute("""
                        INSERT INTO authors (name) VALUES (%s)
                        ON CONFLICT DO NOTHING RETURNING id;
                    """, (a_name,))
                    r2 = cur.fetchone()
                    if not r2:
                        cur.execute("SELECT id FROM authors WHERE name=%s LIMIT 1;", (a_name,))
                        r2 = cur.fetchone()
                    if r2:
                        author_cache[a_name] = r2[0]
                if a_name in author_cache:
                    cur.execute("INSERT INTO book_authors VALUES (%s,%s) ON CONFLICT DO NOTHING;",
                                (book_id, author_cache[a_name]))
            cat_count += 1

    grand_total += cat_count
    print(f"  [{cat_name:<25}]  {cat_count} books")

# ─────────────────────────────────────────────────────────
# 5.  SUMMARY
# ─────────────────────────────────────────────────────────
print(f"\nTotal books loaded: {grand_total}")
print("\n--- Final counts ---")
for t in ["books","authors","book_authors","book_categories","book_inventory","shelf_locations","categories"]:
    cur.execute(f"SELECT COUNT(*) FROM {t};")
    print(f"  {t:<26} {cur.fetchone()[0]:>5}")

cur.execute("SELECT pg_size_pretty(pg_database_size('neondb'));")
print(f"\n  DB size used: {cur.fetchone()[0]}")
cur.close()
conn.close()
