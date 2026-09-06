from datetime import datetime

from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CollectionCreate(BaseModel):
    name: str


class CollectionUpdate(BaseModel):
    name: str


class CollectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    created_at: datetime


class LinkCreate(BaseModel):
    url: str
    collection_id: int | None = None


class LinkUpdate(BaseModel):
    title: str | None = None
    authors: list[str] | None = None
    journal: str | None = None
    publisher: str | None = None
    year: str | None = None
    doi: str | None = None
    note: str | None = None
    collection_id: int | None = None


class LinkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    title: str | None
    authors: list[str] | None
    journal: str | None
    publisher: str | None
    year: str | None
    doi: str | None
    note: str | None
    collection_id: int | None
    created_at: datetime
    updated_at: datetime
