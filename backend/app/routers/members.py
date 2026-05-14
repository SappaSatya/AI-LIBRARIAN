import re
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import LibraryMember, BookInventory
from app.schemas import MemberRegister, MemberOut

router = APIRouter(prefix="/members", tags=["members"])

G_NUMBER_REGEX = re.compile(r"^G\d{8}$")


@router.post("", response_model=MemberOut, status_code=201)
def register_member(body: MemberRegister, db: Session = Depends(get_db)):
    g = body.g_number.upper()
    if not G_NUMBER_REGEX.match(g):
        raise HTTPException(status_code=400, detail="G-Number must be G followed by 8 digits (e.g. G12345678)")

    existing = db.query(LibraryMember).filter(LibraryMember.g_number == g).first()
    if existing:
        # Update name/email/purpose and return
        existing.name    = body.name
        existing.email   = body.email
        existing.purpose = body.purpose
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        active = _active_count(db, g)
        return MemberOut(
            g_number=existing.g_number,
            name=existing.name,
            email=existing.email,
            purpose=existing.purpose,
            active_borrows=active,
        )

    now = datetime.now(timezone.utc)
    member = LibraryMember(
        g_number=g,
        name=body.name,
        email=body.email,
        purpose=body.purpose,
        created_at=now,
        updated_at=now,
    )
    db.add(member)
    db.commit()

    return MemberOut(g_number=g, name=body.name, email=body.email, purpose=body.purpose)


@router.get("/{g_number}", response_model=MemberOut)
def get_member(g_number: str, db: Session = Depends(get_db)):
    g = g_number.upper()
    member = db.query(LibraryMember).filter(LibraryMember.g_number == g).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    active = _active_count(db, g)
    return MemberOut(
        g_number=member.g_number,
        name=member.name,
        email=member.email,
        purpose=member.purpose,
        active_borrows=active,
    )


@router.get("/{g_number}/borrows")
def get_member_borrows(g_number: str, db: Session = Depends(get_db)):
    from sqlalchemy.orm import joinedload
    g = g_number.upper()
    copies = (
        db.query(BookInventory)
        .options(joinedload(BookInventory.book))
        .filter(BookInventory.borrowed_by == g, BookInventory.status == "checked_out")
        .all()
    )
    result = []
    for c in copies:
        result.append({
            "inventory_id": str(c.id),
            "book_id":      str(c.book_id),
            "title":        c.book.title if c.book else "Unknown",
            "cover_url":    c.book.cover_url if c.book else None,
            "copy_number":  c.copy_number,
            "due_date":     c.due_date.strftime("%b %d, %Y") if c.due_date else None,
        })
    return {"g_number": g, "borrows": result, "count": len(result), "limit": 3}


def _active_count(db: Session, g: str) -> int:
    return (
        db.query(BookInventory)
        .filter(BookInventory.borrowed_by == g, BookInventory.status == "checked_out")
        .count()
    )
