import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import books, search, chat, members

app = FastAPI(
    title="Library AI",
    description="Conversational online library assistant by Satya Harsha Sappa",
    version="0.1.0",
)

# Comma-separated origins from env; localhost fallback for dev
_raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}


app.include_router(books.router)
app.include_router(members.router)
app.include_router(search.router)
app.include_router(chat.router)
