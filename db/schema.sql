-- LibriMind AI — Neon PostgreSQL Schema
-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- Authors
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS authors (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL,
    bio         TEXT,
    birth_year  INT,
    death_year  INT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Categories / Genres
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Shelf Locations  (imaginary library layout)
-- Floor 1 → Shelf A10 → Fiction, etc.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shelf_locations (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    floor_number INT  NOT NULL,
    section_name TEXT NOT NULL,
    shelf_code   TEXT NOT NULL,
    description  TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (floor_number, shelf_code)
);

-- ─────────────────────────────────────────
-- Books  (core catalog)
-- embedding uses OpenAI text-embedding-3-small → 1536 dims
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS books (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title            TEXT NOT NULL,
    subtitle         TEXT,
    description      TEXT,
    isbn             TEXT,
    isbn13           TEXT,
    published_year   INT,
    publisher        TEXT,
    page_count       INT,
    language         TEXT DEFAULT 'en',
    cover_url        TEXT,
    open_library_id  TEXT UNIQUE,
    google_books_id  TEXT UNIQUE,
    average_rating   DECIMAL(3,2),
    ratings_count    INT DEFAULT 0,
    embedding        vector(1536),
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Book ↔ Author  (many-to-many)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS book_authors (
    book_id   UUID REFERENCES books(id)   ON DELETE CASCADE,
    author_id UUID REFERENCES authors(id) ON DELETE CASCADE,
    role      TEXT DEFAULT 'author',
    PRIMARY KEY (book_id, author_id)
);

-- ─────────────────────────────────────────
-- Book ↔ Category  (many-to-many)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS book_categories (
    book_id     UUID REFERENCES books(id)      ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (book_id, category_id)
);

-- ─────────────────────────────────────────
-- Book Inventory  (physical copies)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS book_inventory (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id           UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    shelf_location_id UUID REFERENCES shelf_locations(id),
    copy_number       INT  NOT NULL DEFAULT 1,
    status            TEXT NOT NULL DEFAULT 'available'
                          CHECK (status IN ('available','checked_out','reserved','lost','maintenance')),
    barcode           TEXT UNIQUE,
    acquired_at       DATE,
    due_date          DATE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Users
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email        TEXT NOT NULL UNIQUE,
    display_name TEXT,
    avatar_url   TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- User Preferences
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_categories UUID[],
    preferred_authors    UUID[],
    reading_level        TEXT CHECK (reading_level IN ('beginner','intermediate','advanced')),
    language_preference  TEXT DEFAULT 'en',
    embedding            vector(1536),
    created_at           TIMESTAMPTZ DEFAULT NOW(),
    updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Chat Sessions
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_sessions (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    title      TEXT,
    is_active  BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Chat Messages
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role       TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
    content    TEXT NOT NULL,
    metadata   JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Recommendations
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recommendations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id  UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
    user_id     UUID REFERENCES users(id)         ON DELETE SET NULL,
    book_id     UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    reason      TEXT,
    score       DECIMAL(5,4),
    source      TEXT DEFAULT 'semantic' CHECK (source IN ('semantic','llm','collaborative')),
    was_clicked BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Search Logs
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS search_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id)         ON DELETE SET NULL,
    session_id      UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
    query           TEXT NOT NULL,
    query_embedding vector(1536),
    result_count    INT DEFAULT 0,
    search_type     TEXT DEFAULT 'semantic' CHECK (search_type IN ('semantic','keyword','hybrid')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_books_embedding
    ON books USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_search_logs_embedding
    ON search_logs USING ivfflat (query_embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_books_open_library  ON books (open_library_id);
CREATE INDEX IF NOT EXISTS idx_books_google_books  ON books (google_books_id);
CREATE INDEX IF NOT EXISTS idx_inventory_book      ON book_inventory (book_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_session    ON chat_messages (session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_recs_user           ON recommendations (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_search_user         ON search_logs (user_id, created_at);
