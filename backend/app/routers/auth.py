import secrets

from fastapi import APIRouter, HTTPException, status

from app.config import settings
from app.schemas import LoginRequest, TokenResponse
from app.security import create_access_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    valid_username = secrets.compare_digest(payload.username, settings.admin_username)
    valid_password = secrets.compare_digest(payload.password, settings.admin_password)
    if not (valid_username and valid_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = create_access_token(subject=payload.username)
    return TokenResponse(access_token=token)
