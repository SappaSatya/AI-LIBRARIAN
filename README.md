# Library AI — Conversational Online Library Assistant

**Developed by Satya Harsha Sappa**

An AI-powered online library assistant. Users can discover books through natural conversation, semantic search, and personalized recommendations.

---

## What Is This Project?

LibriMind AI lets students and faculty:
- Ask for books in natural language ("I need a book on quantum mechanics for beginners")
- Get AI-powered recommendations with reasons
- See shelf location inside the library (Floor, Section, Shelf code)
- Check availability (available / checked out / reserved)
- Search semantically — not just by keywords
- Get better results over time based on preferences

---

## Database — What Data Do We Have?

The database lives on **Neon (serverless PostgreSQL)** and contains real academic books sourced from the Open Library API.

### Row Counts

| Table            | Rows   | Description                              |
|------------------|--------|------------------------------------------|
| `books`          | 7,975  | Academic books with title, description, cover, year |
| `authors`        | 10,788 | Real authors linked to books             |
| `book_authors`   | ~11k+  | Many-to-many: books ↔ authors            |
| `book_categories`| 7,975  | Every book tagged to a subject category  |
| `book_inventory` | 7,975  | Each book placed on a physical shelf     |
| `shelf_locations`| 63     | GMU-style 5-floor library layout         |
| `categories`     | 25     | Academic subject categories              |
| `users`          | 0      | Ready for user accounts (app feature)   |
| `chat_sessions`  | 0      | Ready for conversation history          |
| `chat_messages`  | 0      | Ready for chat messages                 |
| `recommendations`| 0      | Ready for recommendation tracking       |
| `search_logs`    | 0      | Ready for search analytics              |

**DB Size:** ~19 MB (out of 512 MB free plan limit)

---

## Book Categories (26 University Subjects)

The library contains **~8,000 real academic books** across 26 subject categories, sourced from the Open Library API and organised across 5 floors.

### Floor 1 — Computer Science & Mathematics

| Category | Topics Covered |
|---|---|
| **Mathematics** | Calculus, linear algebra, number theory, topology, geometry, combinatorics, differential equations, real & complex analysis |
| **Computer Science** | Algorithms, data structures, OS, compilers, software engineering, distributed systems, cloud computing, computer networks |
| **Cybersecurity** | Network security, cryptography, ethical hacking, information security, digital forensics |
| **Artificial Intelligence** | Machine learning, deep learning, NLP, computer vision, reinforcement learning, robotics |
| **Data Science** | Data analysis, big data, statistics, statistical learning, data visualization, data mining |

### Floor 2 — Physical Sciences

| Category | Topics Covered |
|---|---|
| **Physics** | Classical mechanics, thermodynamics, electromagnetism, quantum mechanics, astrophysics, nuclear physics, cosmology |
| **Chemistry** | Organic, inorganic, physical, analytical, biochemistry, polymer chemistry, electrochemistry |
| **Environmental Science** | Ecology, climate change, environmental engineering, conservation biology, sustainability |

### Floor 3 — Engineering

| Category | Topics Covered |
|---|---|
| **Mechanical Engineering** | Fluid mechanics, heat transfer, solid mechanics, materials science, manufacturing, vibrations |
| **Aerospace Engineering** | Aerodynamics, rocket propulsion, spacecraft design, flight dynamics, orbital mechanics, avionics |
| **Electrical Engineering** | Electronics, signal processing, control systems, power systems, telecommunications, microelectronics, photonics |
| **Civil Engineering** | Structural engineering, geotechnical, transportation, hydraulics, concrete structures |
| **Bioengineering** | Biomedical devices, biomaterials, tissue engineering, bioinformatics, systems biology |

### Floor 4 — Life Sciences & Health

| Category | Topics Covered |
|---|---|
| **Biology** | Molecular biology, cell biology, genetics, microbiology, ecology, evolutionary biology, immunology, zoology, botany |
| **Neuroscience** | Cognitive science, neuroanatomy, neurophysiology, computational neuroscience, psychiatry |
| **Psychology** | Cognitive, social, developmental, clinical, and behavioral psychology |
| **Public Health** | Epidemiology, global health, health policy, biostatistics, environmental health |

### Floor 5 — Humanities, Social Sciences & Reference

| Category | Topics Covered |
|---|---|
| **History** | American history, world history, ancient & modern history, military history, history of science & technology |
| **Political Science** | International relations, public policy, comparative politics, political theory, diplomacy |
| **Philosophy** | Logic, ethics, epistemology, metaphysics, philosophy of mind, political philosophy |
| **Economics** | Micro/macroeconomics, econometrics, game theory, behavioral economics, international economics |
| **Business** | Finance, entrepreneurship, marketing, accounting, strategic & operations management |
| **Law** | Constitutional law, international law, criminal law, civil law, intellectual property |
| **English & Writing** | Academic & creative writing, English literature, linguistics, rhetoric, technical writing |
| **Research Methods** | Scientific method, experimental design, qualitative & quantitative research, academic skills |

---

## Library Shelf Layout (GMU-style)

63 shelves across 5 floors. Example shelf codes:

| Floor | Section | Shelf | Description |
|-------|---------|-------|-------------|
| 1 | Mathematics | M01 | Calculus, Analysis and Real Analysis |
| 1 | Computer Science | C01 | Algorithms and Data Structures |
| 1 | Artificial Intelligence | AI01 | Machine Learning and Deep Learning |
| 2 | Physics | P03 | Quantum Physics and Quantum Mechanics |
| 2 | Chemistry | CH02 | Organic Chemistry and Reaction Mechanisms |
| 3 | Aerospace Engineering | AE01 | Aerodynamics and Flight Mechanics |
| 3 | Mechanical Engineering | ME02 | Fluid Mechanics and Heat Transfer |
| 4 | Biology | B02 | Genetics and Genomics |
| 5 | Economics | EC01 | Microeconomics and Macroeconomics |
| 5 | Law | LW01 | Constitutional Law and Legal Studies |

Each book in `book_inventory` has:
- `shelf_location_id` → links to a shelf
- `status` → `available`, `checked_out`, `reserved`, `lost`, or `maintenance`
- `copy_number` → how many copies

---

## Data Source

All book data was fetched from:

**Open Library API** — [https://openlibrary.org/developers/api](https://openlibrary.org/developers/api)

- Free, no API key required
- Endpoint used: `GET https://openlibrary.org/subjects/{subject}.json?limit=50&offset=0`
- Example: `https://openlibrary.org/subjects/machine_learning.json?limit=50`
- Returns: title, authors, cover image ID, first publish year, subject tags

Cover images are served from:  
`https://covers.openlibrary.org/b/id/{cover_id}-L.jpg`

---

## Database Connection

The database is hosted on **Neon** — [https://neon.tech](https://neon.tech)

```
postgresql://neondb_owner:npg_ue2JahjDzk4Z@ep-soft-lab-ap1yvqkr-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

> **Note:** This string contains the database password. Do not commit it to a public repo in production. Use environment variables in your app.

---

## How to Connect and Use the Database

### Option 1 — Python (psycopg2)

```bash
pip install psycopg2-binary
```

```python
import psycopg2

conn = psycopg2.connect(
    "postgresql://neondb_owner:npg_ue2JahjDzk4Z@ep-soft-lab-ap1yvqkr-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"
)
cur = conn.cursor()
cur.execute("SELECT title, published_year FROM books LIMIT 10;")
for row in cur.fetchall():
    print(row)
```

### Option 2 — Python (SQLAlchemy / FastAPI)

```bash
pip install sqlalchemy psycopg2-binary
```

```python
from sqlalchemy import create_engine

DATABASE_URL = "postgresql://neondb_owner:npg_ue2JahjDzk4Z@ep-soft-lab-ap1yvqkr-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require"
engine = create_engine(DATABASE_URL)
```

### Option 3 — Node.js (pg)

```bash
npm install pg
```

```js
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_ue2JahjDzk4Z@ep-soft-lab-ap1yvqkr-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require'
})

pool.query('SELECT title FROM books LIMIT 5', (err, res) => {
  console.log(res.rows)
})
```

### Option 4 — Neon Web Console (no code needed)

1. Go to [https://console.neon.tech](https://console.neon.tech)
2. Ask the owner (Mano Harsha) to invite you as a collaborator on the project
3. Use the SQL editor in the browser to run queries directly

### Option 5 — Any PostgreSQL Client (TablePlus, DBeaver, pgAdmin)

Use these credentials:

| Field | Value |
|---|---|
| Host | `ep-soft-lab-ap1yvqkr-pooler.c-7.us-east-1.aws.neon.tech` |
| Port | `5432` |
| Database | `neondb` |
| Username | `neondb_owner` |
| Password | `npg_ue2JahjDzk4Z` |
| SSL | Required |

---

## Useful Queries to Get Started

```sql
-- All books in a subject
SELECT b.title, b.published_year
FROM books b
JOIN book_categories bc ON b.id = bc.book_id
JOIN categories c ON bc.category_id = c.id
WHERE c.name = 'Artificial Intelligence'
LIMIT 20;

-- Find a book and its shelf location
SELECT b.title, sl.floor_number, sl.section_name, sl.shelf_code, bi.status
FROM books b
JOIN book_inventory bi ON b.id = bi.book_id
JOIN shelf_locations sl ON bi.shelf_location_id = sl.id
WHERE b.title ILIKE '%machine learning%';

-- Count books per category
SELECT c.name, COUNT(*) as total
FROM categories c
JOIN book_categories bc ON c.id = bc.category_id
GROUP BY c.name
ORDER BY total DESC;

-- Available books on Floor 3 (Engineering)
SELECT b.title, sl.section_name, sl.shelf_code
FROM books b
JOIN book_inventory bi ON b.id = bi.book_id
JOIN shelf_locations sl ON bi.shelf_location_id = sl.id
WHERE sl.floor_number = 3 AND bi.status = 'available'
LIMIT 20;
```

---

## Project Structure

```
AI-Librarian/
├── db/
│   ├── schema.sql           # Full database schema (all 13 tables)
│   ├── run_schema.py        # Runs schema.sql against Neon
│   ├── seed_university.py   # Seeds shelves, categories, first batch of books
│   ├── seed_more_uni.py     # Second pass — brings total to ~8000 books
│   └── check_data.py        # Quick row count check
├── plan.md                  # Full project architecture plan
└── README.md                # This file
```

---

## Tech Stack (Planned)

| Layer | Technology |
|---|---|
| Frontend | Next.js + React + Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | Neon PostgreSQL (serverless) |
| Vector Search | pgvector (built into Neon) |
| AI / Chat | OpenAI API (GPT-4o) |
| Embeddings | OpenAI text-embedding-3-small (1536 dims) |
| Book Data | Open Library API |
| Deployment | Vercel (frontend) + Render (backend) |

---

## Next Steps

- [ ] Scaffold FastAPI backend
- [ ] Build REST endpoints: `/books`, `/search`, `/chat`, `/recommend`
- [ ] Generate OpenAI embeddings for all 8000 books and store in `pgvector`
- [ ] Build Next.js chat UI
- [ ] Connect frontend to backend
- [ ] Deploy to Vercel + Render
