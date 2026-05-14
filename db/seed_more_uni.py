"""
Second pass — fetch more books per subject with pagination to reach ~5000 total.
Does NOT wipe existing data — only adds new unique books.
"""
import psycopg2
import requests
import time
import random

DATABASE_URL = "postgresql://neondb_owner:npg_ue2JahjDzk4Z@ep-soft-lab-ap1yvqkr-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"

conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

# load existing maps
cur.execute("SELECT name, id FROM categories;")
category_id_map = dict(cur.fetchall())

cur.execute("SELECT section_name, id FROM shelf_locations;")
shelf_id_map = {}
for section, sid in cur.fetchall():
    shelf_id_map.setdefault(section, []).append(sid)

cur.execute("SELECT open_library_id FROM books WHERE open_library_id IS NOT NULL;")
existing_ol = {r[0] for r in cur.fetchall()}

cur.execute("SELECT name, id FROM authors;")
author_cache = {name: aid for name, aid in cur.fetchall()}

# ── Expanded subject list per category ────────────────────
CATEGORY_SUBJECTS = {
    "Mathematics":            [
        "mathematics","calculus","linear_algebra","abstract_algebra",
        "number_theory","topology","geometry","combinatorics",
        "mathematical_analysis","numerical_analysis","discrete_mathematics",
        "differential_equations","real_analysis","complex_analysis",
    ],
    "Computer Science":       [
        "computer_science","computer_programming","algorithms",
        "data_structures","software_engineering","computer_architecture",
        "operating_systems","compilers","programming_languages",
        "distributed_systems","cloud_computing","computer_networks",
    ],
    "Cybersecurity":          [
        "computer_security","cryptography","network_security",
        "information_security","ethical_hacking","digital_forensics",
    ],
    "Artificial Intelligence":[
        "artificial_intelligence","machine_learning","deep_learning",
        "neural_networks","natural_language_processing","computer_vision",
        "reinforcement_learning","robotics",
    ],
    "Data Science":           [
        "data_science","data_analysis","data_mining","big_data",
        "statistics","statistical_learning","data_visualization",
    ],
    "Physics":                [
        "physics","classical_mechanics","thermodynamics","electromagnetism",
        "quantum_mechanics","optics","nuclear_physics","astrophysics",
        "solid_state_physics","particle_physics","cosmology",
    ],
    "Chemistry":              [
        "chemistry","organic_chemistry","inorganic_chemistry",
        "physical_chemistry","analytical_chemistry","biochemistry",
        "polymer_chemistry","electrochemistry","computational_chemistry",
    ],
    "Environmental Science":  [
        "environmental_science","ecology","climate_change",
        "environmental_engineering","conservation_biology","sustainability",
    ],
    "Mechanical Engineering": [
        "mechanical_engineering","fluid_mechanics","heat_transfer",
        "solid_mechanics","materials_science","manufacturing_engineering",
        "dynamics","vibrations","finite_element_analysis",
    ],
    "Aerospace Engineering":  [
        "aeronautics","aerospace_engineering","aerodynamics",
        "rocket_propulsion","spacecraft_design","flight_dynamics",
        "orbital_mechanics","avionics",
    ],
    "Electrical Engineering": [
        "electrical_engineering","electronics","signal_processing",
        "control_systems","power_systems","telecommunications",
        "digital_electronics","microelectronics","photonics",
    ],
    "Civil Engineering":      [
        "civil_engineering","structural_engineering","geotechnical_engineering",
        "transportation_engineering","hydraulics","concrete_structures",
    ],
    "Bioengineering":         [
        "biomedical_engineering","biomaterials","tissue_engineering",
        "bioinformatics","medical_devices","systems_biology",
    ],
    "Biology":                [
        "biology","molecular_biology","cell_biology","genetics",
        "microbiology","ecology","evolutionary_biology",
        "biochemistry","zoology","botany","immunology",
    ],
    "Neuroscience":           [
        "neuroscience","cognitive_science","neuroanatomy",
        "neurophysiology","computational_neuroscience","psychiatry",
    ],
    "Psychology":             [
        "psychology","cognitive_psychology","social_psychology",
        "developmental_psychology","clinical_psychology","behavioral_psychology",
    ],
    "English & Writing":      [
        "academic_writing","english_literature","composition",
        "linguistics","rhetoric","technical_writing",
        "creative_writing","literary_theory","applied_linguistics",
    ],
    "Economics":              [
        "economics","microeconomics","macroeconomics","econometrics",
        "game_theory","behavioral_economics","international_economics",
        "public_economics","development_economics",
    ],
    "Political Science":      [
        "political_science","american_politics","international_relations",
        "comparative_politics","public_policy","political_theory",
        "diplomacy","public_administration",
    ],
    "History":                [
        "american_history","world_history","history_of_science",
        "ancient_history","modern_history","military_history",
        "history_of_technology","social_history",
    ],
    "Philosophy":             [
        "philosophy","logic","ethics","philosophy_of_science",
        "epistemology","metaphysics","philosophy_of_mind",
        "political_philosophy",
    ],
    "Business":               [
        "business_management","finance","entrepreneurship",
        "marketing","accounting","organizational_behavior",
        "strategic_management","operations_management",
    ],
    "Law":                    [
        "law","constitutional_law","international_law",
        "criminal_law","civil_law","intellectual_property",
    ],
    "Research Methods":       [
        "research_methods","scientific_method","experimental_design",
        "qualitative_research","quantitative_research","academic_skills",
    ],
    "Public Health":          [
        "public_health","epidemiology","global_health",
        "health_policy","biostatistics","environmental_health",
    ],
}

BOOKS_PER_SUBJECT = 50
STATUSES = ["available","available","available","available","checked_out","reserved"]

def fetch_works(subject_key, limit=50, offset=0):
    url = f"https://openlibrary.org/subjects/{subject_key}.json?limit={limit}&offset={offset}"
    try:
        r = requests.get(url, timeout=20)
        r.raise_for_status()
        return r.json().get("works", [])
    except Exception as e:
        print(f"      [warn] {subject_key}: {e}")
        return []

grand_total = 0
print(f"Fetching additional university books (up to {BOOKS_PER_SUBJECT}/subject)...\n")

for cat_name, subject_keys in CATEGORY_SUBJECTS.items():
    cat_id  = category_id_map.get(cat_name)
    shelves = shelf_id_map.get(cat_name, [])
    cat_count = 0

    for subj in subject_keys:
        works = fetch_works(subj, limit=BOOKS_PER_SUBJECT)
        time.sleep(0.25)

        for w in works:
            title = (w.get("title") or "").strip()
            ol_id = w.get("key", "").replace("/works/", "")
            if not title or not ol_id or ol_id in existing_ol:
                continue

            cover     = w.get("cover_id")
            year      = w.get("first_publish_year")
            desc      = w.get("description") or ""
            if isinstance(desc, dict):
                desc = desc.get("value", "")
            cover_url = f"https://covers.openlibrary.org/b/id/{cover}-L.jpg" if cover else None

            cur.execute("""
                INSERT INTO books (title, description, published_year, cover_url, open_library_id)
                VALUES (%s,%s,%s,%s,%s)
                ON CONFLICT (open_library_id) DO NOTHING
                RETURNING id;
            """, (title, desc[:2000] or None, year, cover_url, ol_id))
            row = cur.fetchone()
            if not row:
                continue
            book_id = row[0]
            existing_ol.add(ol_id)

            if cat_id:
                cur.execute("INSERT INTO book_categories VALUES (%s,%s) ON CONFLICT DO NOTHING;",
                            (book_id, cat_id))
            if shelves:
                cur.execute("""
                    INSERT INTO book_inventory
                        (book_id, shelf_location_id, copy_number, status, acquired_at)
                    VALUES (%s,%s,%s,%s,'2024-01-01')
                    ON CONFLICT DO NOTHING;
                """, (book_id, random.choice(shelves), random.randint(1,4), random.choice(STATUSES)))

            for a in w.get("authors", [])[:3]:
                a_name = (a.get("name") or "").strip()
                if not a_name:
                    continue
                if a_name not in author_cache:
                    cur.execute("INSERT INTO authors (name) VALUES (%s) ON CONFLICT DO NOTHING RETURNING id;",
                                (a_name,))
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
    print(f"  [{cat_name:<25}]  +{cat_count}  new books")

print(f"\nNew books added this run: {grand_total}")
print("\n--- Final counts ---")
for t in ["books","authors","book_inventory","shelf_locations","categories"]:
    cur.execute(f"SELECT COUNT(*) FROM {t};")
    print(f"  {t:<26} {cur.fetchone()[0]:>5}")

cur.execute("SELECT pg_size_pretty(pg_database_size('neondb'));")
print(f"\n  DB size: {cur.fetchone()[0]}")
cur.close()
conn.close()
