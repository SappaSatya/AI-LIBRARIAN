# Library AI — Project Status

## What Has Been Built

### Frontend (Next.js 15, Tailwind CSS)
- **Landing page** (`/`) — hero, book carousel (auto-scroll two rows), How It Works pipeline diagram, About section, genre tags, tech stack, footer
- **Quick Search modal** — spotlight-style, no login required, searches by title, shows shelf location + copy status, "Ask AI" fallback
- **AI Chat page** (`/chat`) — full dark navy theme, session management, book recommendation cards with availability badges, auto-resize textarea, suggestion chips
- **Wishlist** — localStorage-based, add from BookModal, borrow directly from wishlist panel, per-item borrow state
- **Return Books modal** — 2-step: enter G-number → see borrowed books → click Return (calls API, updates DB)
- **BookModal** — cover, authors, description, inventory copies, Add to Wishlist, Borrow button
- **Sidebar** — parallelogram-stacked book covers (clip-path effect), "My Books" borrow history panel fetched from API
- **Top bar** — home icon (→ `/`), user name + G-number + borrow count (left), Wishlist + Log out (right)
- **Voice input** — Web Speech API mic → transcript → AI → browser TTS speak-back (Chrome/Edge only)
- **Onboarding modal** — register with G-number + name + email

### Backend (FastAPI + PostgreSQL + pgvector)
- `POST /chat` — OpenAI GPT-4o with pgvector semantic search, session tracking
- `GET /books` — paginated book list with inventory
- `GET /books/locate?q=` — title search, returns copies + shelf locations
- `GET /books/{id}` — book detail with full inventory
- `POST /books/{id}/borrow` — checks out copy for 7 days, enforces 3-book limit
- `POST /books/{id}/return` — marks copy available, clears borrowed_by + due_date
- `POST /members` — register student
- `GET /members/{g_number}` — get member + active borrow count
- `GET /members/{g_number}/borrows` — list currently borrowed books with title + cover_url + due_date

### Background Image
- `public/backgrounds/library1.jpg` and `library2.webp` copied from `/backgounds/` folder
- `library2.webp` used as chat page background at 18% opacity

---

## What Needs To Be Done

### 1. VOICE AGENT (Priority — build on chat page)
Current state: Web Speech API only (browser STT + browser TTS). Works in Chrome/Edge, not Safari.

**What to build:**
- Use **OpenAI Realtime API** (GPT-4o audio) via WebSocket for a true voice-to-voice AI agent
- Or: send mic audio → backend → Whisper STT → GPT-4o → TTS API → play audio back
- The backend route would be `POST /chat/voice` accepting audio blob, returning audio stream
- Show a dedicated "Voice Mode" UI — waveform animation, push-to-talk or continuous listening
- The "Voice Chat (soon)" button in QuickSearchModal should be enabled once this is built

### 2. DEPLOYMENT
#### Backend → Render
- `render.yaml` is at `backend/render.yaml` — push to GitHub and connect to Render
- Set env vars in Render dashboard: `DATABASE_URL`, `OPENAI_API_KEY`
- Use **Neon** (neon.tech) or **Supabase** for hosted PostgreSQL + pgvector
- After deploy, copy the Render URL (e.g. `https://librarian-ai.onrender.com`) and set it in Vercel

#### Frontend → Vercel
- `vercel.json` is at `frontend/vercel.json`
- Push to GitHub, import project in Vercel
- Set env var: `NEXT_PUBLIC_API_URL=https://your-render-url.onrender.com`
- Vercel auto-deploys on every push to main

#### Database migration on Render
- After connecting DB, run: `python -m alembic upgrade head` (or the seed script in `/db/`)

### 3. AI CHAT UI IMPROVEMENTS (minor, do later)
- Message timestamps
- "Copy" button on AI responses
- Markdown rendering in AI message bubbles (bold, lists, links)
- Session history in sidebar (list past chat sessions, click to reload)
- Show book cover thumbnails inline inside AI message text

### 4. ANYTHING ELSE THE USER WANTS
- _(Add here as new features are requested)_

---

## Environment Variables Needed

### Backend (.env)
```
DATABASE_URL=postgresql://user:pass@host/dbname
OPENAI_API_KEY=sk-...
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000   # dev
# NEXT_PUBLIC_API_URL=https://your-app.onrender.com  # prod
```

---

## Running Locally

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```
