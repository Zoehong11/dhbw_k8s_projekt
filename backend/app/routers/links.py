import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Link
from app.scraper import fetch_metadata
from app.schemas import LinkCreate, LinkOut, LinkUpdate
from app.security import require_auth

router = APIRouter(prefix="/api/links", tags=["links"], dependencies=[Depends(require_auth)])


@router.get("", response_model=list[LinkOut])
def list_links(
    q: str | None = None,
    collection_id: int | None = None,
    db: Session = Depends(get_db),
):
    stmt = select(Link)
    if collection_id is not None:
        stmt = stmt.where(Link.collection_id == collection_id)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Link.title.ilike(like), Link.journal.ilike(like), Link.url.ilike(like)))
    stmt = stmt.order_by(Link.created_at.desc())
    return db.scalars(stmt).all()


@router.post("", response_model=LinkOut, status_code=status.HTTP_201_CREATED)
async def create_link(payload: LinkCreate, db: Session = Depends(get_db)):
    try:
        metadata = await fetch_metadata(payload.url)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not fetch metadata for URL: {exc}",
        )

    link = Link(
        url=payload.url,
        title=metadata.get("title"),
        authors=metadata.get("authors"),
        journal=metadata.get("journal"),
        publisher=metadata.get("publisher"),
        year=metadata.get("year"),
        doi=metadata.get("doi"),
        raw_metadata=metadata,
        collection_id=payload.collection_id,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link


@router.get("/{link_id}", response_model=LinkOut)
def get_link(link_id: int, db: Session = Depends(get_db)):
    link = db.get(Link, link_id)
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")
    return link


@router.patch("/{link_id}", response_model=LinkOut)
def update_link(link_id: int, payload: LinkUpdate, db: Session = Depends(get_db)):
    link = db.get(Link, link_id)
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(link, field, value)
    db.commit()
    db.refresh(link)
    return link


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_link(link_id: int, db: Session = Depends(get_db)):
    link = db.get(Link, link_id)
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Link not found")
    db.delete(link)
    db.commit()
