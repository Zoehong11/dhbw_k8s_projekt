from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Collection
from app.schemas import CollectionCreate, CollectionOut, CollectionUpdate
from app.security import require_auth

router = APIRouter(prefix="/api/collections", tags=["collections"], dependencies=[Depends(require_auth)])


@router.get("", response_model=list[CollectionOut])
def list_collections(db: Session = Depends(get_db)):
    return db.scalars(select(Collection).order_by(Collection.name)).all()


@router.post("", response_model=CollectionOut, status_code=status.HTTP_201_CREATED)
def create_collection(payload: CollectionCreate, db: Session = Depends(get_db)):
    existing = db.scalar(select(Collection).where(Collection.name == payload.name))
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Collection already exists")
    collection = Collection(name=payload.name)
    db.add(collection)
    db.commit()
    db.refresh(collection)
    return collection


@router.patch("/{collection_id}", response_model=CollectionOut)
def update_collection(collection_id: int, payload: CollectionUpdate, db: Session = Depends(get_db)):
    collection = db.get(Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")
    collection.name = payload.name
    db.commit()
    db.refresh(collection)
    return collection


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(collection_id: int, db: Session = Depends(get_db)):
    collection = db.get(Collection, collection_id)
    if not collection:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collection not found")
    db.delete(collection)
    db.commit()
