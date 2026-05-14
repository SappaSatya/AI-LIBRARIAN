import uuid
from sqlalchemy import (
    Column, Text, Integer, Boolean, Numeric, Date,
    ForeignKey, ARRAY, TIMESTAMP, CheckConstraint, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email      = Column(Text, unique=True)
    name       = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True))


class Author(Base):
    __tablename__ = "authors"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name       = Column(Text, nullable=False)
    bio        = Column(Text)
    birth_year = Column(Integer)
    death_year = Column(Integer)
    created_at = Column(TIMESTAMP(timezone=True))

    books = relationship("Book", secondary="book_authors", back_populates="authors")


class Category(Base):
    __tablename__ = "categories"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name        = Column(Text, nullable=False, unique=True)
    description = Column(Text)
    created_at  = Column(TIMESTAMP(timezone=True))

    books = relationship("Book", secondary="book_categories", back_populates="categories")


class ShelfLocation(Base):
    __tablename__ = "shelf_locations"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    floor_number = Column(Integer, nullable=False)
    section_name = Column(Text, nullable=False)
    shelf_code   = Column(Text, nullable=False)
    description  = Column(Text)
    created_at   = Column(TIMESTAMP(timezone=True))

    __table_args__ = (UniqueConstraint("floor_number", "shelf_code"),)


class Book(Base):
    __tablename__ = "books"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title            = Column(Text, nullable=False)
    subtitle         = Column(Text)
    description      = Column(Text)
    isbn             = Column(Text)
    isbn13           = Column(Text)
    published_year   = Column(Integer)
    publisher        = Column(Text)
    page_count       = Column(Integer)
    language         = Column(Text, default="en")
    cover_url        = Column(Text)
    open_library_id  = Column(Text, unique=True)
    google_books_id  = Column(Text, unique=True)
    average_rating   = Column(Numeric(3, 2))
    ratings_count    = Column(Integer, default=0)
    embedding        = Column(Vector(1536))
    created_at       = Column(TIMESTAMP(timezone=True))
    updated_at       = Column(TIMESTAMP(timezone=True))

    authors      = relationship("Author", secondary="book_authors", back_populates="books")
    categories   = relationship("Category", secondary="book_categories", back_populates="books")
    inventory    = relationship("BookInventory", back_populates="book")


class BookAuthor(Base):
    __tablename__ = "book_authors"

    book_id   = Column(UUID(as_uuid=True), ForeignKey("books.id", ondelete="CASCADE"), primary_key=True)
    author_id = Column(UUID(as_uuid=True), ForeignKey("authors.id", ondelete="CASCADE"), primary_key=True)
    role      = Column(Text, default="author")


class BookCategory(Base):
    __tablename__ = "book_categories"

    book_id     = Column(UUID(as_uuid=True), ForeignKey("books.id", ondelete="CASCADE"), primary_key=True)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True)


class BookInventory(Base):
    __tablename__ = "book_inventory"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    book_id           = Column(UUID(as_uuid=True), ForeignKey("books.id", ondelete="CASCADE"), nullable=False)
    shelf_location_id = Column(UUID(as_uuid=True), ForeignKey("shelf_locations.id"))
    copy_number       = Column(Integer, nullable=False, default=1)
    status            = Column(Text, nullable=False, default="available")
    barcode           = Column(Text, unique=True)
    acquired_at       = Column(Date)
    created_at        = Column(TIMESTAMP(timezone=True))
    updated_at        = Column(TIMESTAMP(timezone=True))

    __table_args__ = (
        CheckConstraint("status IN ('available','checked_out','reserved','lost','maintenance')"),
    )

    book           = relationship("Book", back_populates="inventory")
    shelf_location = relationship("ShelfLocation")


class ChatSession(Base):
    __tablename__ = "chat_sessions"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title      = Column(Text)
    is_active  = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True))
    updated_at = Column(TIMESTAMP(timezone=True))

    messages = relationship("ChatMessage", back_populates="session", order_by="ChatMessage.created_at")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role       = Column(Text, nullable=False)
    content    = Column(Text, nullable=False)
    extra_data = Column("metadata", JSONB)
    created_at = Column(TIMESTAMP(timezone=True))

    session = relationship("ChatSession", back_populates="messages")
