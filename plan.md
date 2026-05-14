# LibriMind AI Plan

## Goal

Build `LibriMind AI - Conversational Library Assistant`, a modern AI-powered web app that helps users discover books through natural conversation, semantic search, and personalized recommendations.

We will build locally first, then push to GitHub, and deploy in stages.

## Product Direction

The app should let users:

- ask for books in natural language
- get conversational recommendations with reasons
- view rich book details
- see imaginary but realistic library shelf locations
- search semantically instead of only by keywords
- get better recommendations over time based on preferences

## Final Architecture

### Frontend

- `Next.js`
- `React`
- `Tailwind CSS`
- ChatGPT-style conversational UI

### Backend

- `FastAPI`
- REST APIs for books, chat, recommendations, ingestion, and health checks

### AI Layer

- `OpenAI API` for conversational responses and recommendation reasoning
- `Sentence Transformers` or OpenAI embeddings for semantic search

### Storage

- `AWS S3`
  - raw API dumps
  - CSV/JSON imports
  - cached assets or export files
- `AWS RDS PostgreSQL`
  - application data
  - library catalog
  - users
  - chat history
  - shelf locations
  - availability
- `pgvector`
  - book embeddings for semantic search

### Deployment

- local development first
- `GitHub` for source control
- `Vercel` for frontend
- `Render` or `AWS` for backend if needed
- `AWS RDS` and `AWS S3` for production data

## Important Storage Decision

We are **not** using `S3` as the main application database.

Correct usage:

- `S3` stores raw and imported data
- `RDS PostgreSQL` stores structured relational data used by the app
- `pgvector` stores embeddings for semantic retrieval

## Data Sources

### External Sources

- `Open Library API`
- `Google Books API`

### Internal / Custom Data

- imaginary library floor/section/shelf mapping
- custom availability status
- personalized user preferences
- chat and recommendation history

## Core Entities

We will likely need these main tables:

- `books`
- `authors`
- `book_authors`
- `categories`
- `book_categories`
- `shelf_locations`
- `book_inventory`
- `users`
- `user_preferences`
- `chat_sessions`
- `chat_messages`
- `recommendations`
- `search_logs`

## Shelf Location Model

We will create our own realistic library layout.

Example format:

- `Floor 1 -> Shelf A10 -> Fiction`
- `Floor 2 -> Shelf B12 -> AI & Data Science`
- `Floor 3 -> Shelf C07 -> Self Help`

Each book or copy should be linked to:

- floor number
- section name
- rack or shelf code
- availability status

## Semantic Search Plan

1. fetch book metadata
2. clean and normalize the book data
3. store raw files in `S3`
4. insert structured records into `PostgreSQL`
5. generate embeddings for title, description, and subjects
6. store embeddings in `pgvector`
7. retrieve similar books using vector search
8. use the LLM to explain why the books were recommended

## API Plan

Planned backend endpoints:

- `GET /health`
- `GET /books`
- `GET /books/{id}`
- `POST /chat`
- `POST /recommend`
- `POST /ingest/openlibrary`
- `POST /ingest/googlebooks`
- `GET /search/semantic`

## Local Development Plan

We will build the app locally first.

Suggested local workflow:

1. scaffold frontend and backend
2. define schema and tables
3. build ingestion pipeline
4. load sample data
5. add embeddings and semantic retrieval
6. build chat UI
7. connect frontend to backend
8. test recommendations and shelf lookup

## Deployment Plan

### Phase 1

- build locally
- keep sample data small
- verify chat, book listing, and semantic search

### Phase 2

- push code to `GitHub`
- deploy frontend to `Vercel`
- deploy backend to `Render` or `AWS`
- connect backend to `RDS PostgreSQL`
- connect ingestion pipeline to `S3`

### Phase 3

- production hardening
- environment variables
- logging
- rate limits
- better error handling
- caching if needed

## Tomorrow's Execution Plan

### Day 1 Focus

1. initialize repository structure
2. choose frontend and backend folder layout
3. define database schema
4. create initial ER-style table plan
5. decide whether to start with `Sentence Transformers` or OpenAI embeddings
6. prepare sample ingestion flow from public APIs

### Likely Folder Structure

```text
AI-Librarian/
  frontend/
  backend/
  scripts/
  docs/
  data/
  plan.md
```

## Tech Choices To Confirm Tomorrow

- `FastAPI` vs `Flask`
- `pgvector` in `RDS` vs separate vector DB
- `Sentence Transformers` vs OpenAI embeddings
- backend deploy target: `Render` or `AWS`

## Recommended Defaults

Unless we decide otherwise tomorrow, use:

- `Next.js` for frontend
- `FastAPI` for backend
- `AWS RDS PostgreSQL` for structured data
- `pgvector` for vector search
- `AWS S3` for raw data storage
- `OpenAI API` for chat and reasoning
- `Open Library` and `Google Books` as initial book sources

## Success Criteria

The first usable version should allow a user to:

- open the app
- ask for books in natural language
- receive useful recommendations
- see book details and shelf location
- retrieve results using semantic similarity

## Notes

- start simple and keep the first version small
- use imaginary but consistent shelf data
- make the architecture production-friendly from the beginning
- optimize for a strong end-to-end demo before adding advanced personalization
