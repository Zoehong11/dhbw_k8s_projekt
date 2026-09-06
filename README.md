# Link Library

A two-part web application for saving links to academic papers and other web resources, with automatic metadata extraction, collections, and search. Built as a DHBW course project to demonstrate 12-factor application design, containerization, and Kubernetes deployment.

## Overview

* Saves a URL and extracts citation metadata (title, authors, journal or publisher, year) from the page's `citation_*` / OpenGraph meta tags (the convention used by arXiv, IEEE, ACM, Springer, and most academic publishers)
* Stores links and metadata centrally in PostgreSQL
* Groups links into named collections
* Full-text search across title, journal, and URL

Future work: BibLaTeX export for import into an existing Zotero library.

## Architecture

```
Browser → frontend (React, nginx) → /api/* → backend (FastAPI) → PostgreSQL
```

Two independently deployable services sharing only the HTTP API contract. In Kubernetes, one Ingress routes `/api` to the backend and everything else to the frontend; locally via `docker-compose` they talk cross-origin on separate ports.

## Quickstart

### Local (docker-compose)

```bash
docker compose up -d --build
```

* Frontend: http://localhost:5173
* Backend: http://localhost:8000
* Default credentials: `admin` / `changeme` (set via `docker-compose.yml`)

## 12-Factor App

Not all 12 factors are relevant for a project this size, so only the ones we actually did something for are listed below.

| # | Factor | What we did |
|---|---|---|
| I | Codebase | One repo, two apps (`backend/`, `frontend/`), each with its own Dockerfile that builds its own image. |
| III | Config | The app code itself never hardcodes config, it only reads env vars (`app/config.py`: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_USERNAME`/`PASSWORD`, ...). |
| IV | Backing services | Postgres is only ever referenced through `DATABASE_URL`. Swapping it for a different database instance is just changing that one env var, no code touched. |
| V | Build, release, run | Build = `docker build` produces the image. Release = that image plus config for whichever environment it's run in. Run = `uvicorn`/`nginx` actually executing it. Nothing gets changed inside a running container. |
| VI | Processes | The backend keeps no session state, auth is just a JWT checked on every request. So it doesn't matter which instance ends up handling a given request. |
| IX | Disposability | `uvicorn` starts in about a second. If it can't reach Postgres at startup it exits right away instead of hanging, so it's safe for whatever's running it to just restart it, saw this happen a couple of times during testing and it recovered fine. |