from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import books, search, chat, members

app = FastAPI(
    title="Library AI",
    description="Conversational online library assistant by Satya Harsha Sappa",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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
