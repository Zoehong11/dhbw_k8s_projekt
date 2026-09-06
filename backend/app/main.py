import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.config import settings
from app.database import Base, engine
from app.routers import auth, collections, health, links

logging.basicConfig(level=settings.log_level.upper())

app = FastAPI(title="Link Library API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(collections.router)
app.include_router(links.router)

Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
