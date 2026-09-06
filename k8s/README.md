# Link Library

A two-part web application for saving links to academic papers and other web resources, with automatic metadata extraction, collections, and search. Built as a DHBW course project to demonstrate 12-factor application design, containerization, and Kubernetes deployment.

## Overview

* Saves a URL and extracts citation metadata (title, authors, journal or publisher, year) from the page's `citation_*` / OpenGraph meta tags (the convention used by arXiv, IEEE, ACM, Springer, and most academic publishers)
* Stores links and metadata centrally in PostgreSQL
* Groups links into named collections
* Full-text search across title, journal, and URL
* Single-user, token-protected access (JWT, no public registration)

Future work: BibLaTeX export for import into an existing Zotero library.

## Architecture

Two independently deployable services communicating over HTTP:

frontend (React/Vite, served by nginx)
/api/* -> backend (FastAPI) -> PostgreSQL


| Component | Stack | Responsibilities |
|---|---|---|
| `backend/` | FastAPI, SQLAlchemy, PostgreSQL | JWT auth, link metadata scraping (`httpx` + `BeautifulSoup`), collections, search, health/readiness probes, Prometheus metrics |
| `frontend/` | React (Vite), nginx | Static SPA; calls the backend directly from the browser via `fetch` |

The two services share only the HTTP API contract — no shared code or database access from the frontend. In Kubernetes, one Ingress routes `/api`, `/healthz`, `/readyz` to the backend and everything else to the frontend (same-origin, no CORS required). In `docker-compose`, the services run on separate ports and communicate cross-origin (CORS configured accordingly).

### Backend API

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Exchange username/password for a JWT |
| `GET` | `/api/collections` | List collections |
| `POST` | `/api/collections` | Create a collection |
| `PATCH` | `/api/collections/{id}` | Rename a collection |
| `DELETE` | `/api/collections/{id}` | Delete a collection |
| `GET` | `/api/links` | List links (`?q=`, `?collection_id=`) |
| `POST` | `/api/links` | Save a link; triggers metadata scraping |
| `GET` | `/api/links/{id}` | Fetch one link |
| `PATCH` | `/api/links/{id}` | Edit link metadata / move to a collection |
| `DELETE` | `/api/links/{id}` | Delete a link |
| `GET` | `/healthz` | Liveness probe |
| `GET` | `/readyz` | Readiness probe (checks database connectivity) |
| `GET` | `/metrics` | Prometheus exposition format |

## Quickstart

### Local (docker-compose)

```bash
docker compose up -d --build
```

* Frontend: http://localhost:5173
* Backend: http://localhost:8000
* Default credentials: `admin` / `changeme` (set via `docker-compose.yml`)

### Kubernetes (kind)

```bash
# 1. Cluster with host ports 80/443 mapped, for ingress-nginx
kind create cluster --config k8s/kind-config.yaml

# 2. Ingress controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.11.3/deploy/static/provider/kind/deploy.yaml
kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=180s

# 3. Application images
docker build -t linklib-backend:local ./backend
docker build -t linklib-frontend:local ./frontend
kind load docker-image linklib-backend:local linklib-frontend:local --name linklib

# 4. Application manifests
kubectl apply -f k8s/base/

# 5. Monitoring stack (see below)
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
kubectl create namespace monitoring
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack --namespace monitoring -f k8s/monitoring/values.yaml --wait
kubectl apply -f k8s/monitoring/servicemonitor.yaml -f k8s/monitoring/dashboard-configmap.yaml
```

Add the following to `/etc/hosts` to reach the app by name:

```
127.0.0.1 linklib.local grafana.linklib.local prometheus.linklib.local
```

* Application: http://linklib.local
* Grafana: http://grafana.linklib.local (`admin` / `admin`)
* Prometheus: http://prometheus.linklib.local

## 12-Factor App

| # | Factor | Implementation |
|---|---|---|
| I | Codebase | One repository, two deployable applications (`backend/`, `frontend/`), each with its own Dockerfile and image. |
| II | Dependencies | Backend: `requirements.txt`, installed into the image with no reliance on system packages beyond `libpq`. Frontend: `package.json` + lockfile, `npm ci` in the Docker build stage. |
| III | Config | All environment-specific values come from env vars. Backend: `pydantic-settings` (`app/config.py`) reads `DATABASE_URL`, `JWT_SECRET`, `ADMIN_USERNAME`/`PASSWORD`, `CORS_ORIGINS`, etc. Frontend: since the build is static, `API_URL` is written into `env-config.js` at container start (`docker-entrypoint.sh`), so one image serves any environment without a rebuild. |
| IV | Backing services | PostgreSQL is attached solely via `DATABASE_URL`; pointing at a different instance requires no code change. |
| V | Build, release, run | Docker multi-stage builds produce an immutable image (build); config is injected at deploy time via Kubernetes ConfigMaps/Secrets or `docker-compose` env (release); `uvicorn`/`nginx` execute it (run). |
| VI | Processes | The backend is stateless — authentication is a signed JWT, not a server-side session — so any replica can serve any request. All persistent state lives in PostgreSQL. |
| VII | Port binding | The backend binds `0.0.0.0:8000` via `uvicorn`; the frontend's nginx binds `8080`. Both are self-contained, with no runtime injection of a web server. |
| VIII | Concurrency | Scaling is horizontal pod replication — see `replicas: 2` in `k8s/base/backend.yaml` and `frontend.yaml` — with no sticky state involved. |
| IX | Disposability | Fast startup (`uvicorn` in ~1s); graceful shutdown via standard signal handling. Pods that start before PostgreSQL is ready restart automatically and recover. |
| X | Dev/prod parity | `docker-compose.yml` runs the same images, built from the same Dockerfiles, against the same PostgreSQL version as Kubernetes. |
| XI | Logs | Both processes write to stdout/stderr; nothing is written to a log file inside the container. Logs are read via `kubectl logs` / `docker compose logs`, treated as an event stream. |
| XII | Admin processes | Schema creation (`Base.metadata.create_all`) runs at backend startup in the same codebase and environment as the application — no separate migration step at this project's scope. |

## CNCF Technology: Prometheus, Grafana, and Helm

The observability stack is installed via the [`kube-prometheus-stack`](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack) Helm chart (`k8s/monitoring/values.yaml`), which brings together three CNCF projects:

* **Prometheus** scrapes the backend's `/metrics` endpoint (exposed via `prometheus-fastapi-instrumentator`) through a `ServiceMonitor` (`k8s/monitoring/servicemonitor.yaml`), collecting per-endpoint request counts, latency histograms, and error rates.
* **Grafana** visualizes those metrics. A dashboard (`k8s/monitoring/dashboard-configmap.yaml`) is provisioned automatically via Grafana's sidecar dashboard discovery, showing request rate by endpoint, 5xx error rate, p95 latency, and live pod count.
* **Helm** manages the installation and configuration of the whole stack as a single versioned release, rather than hand-maintaining dozens of Prometheus Operator manifests.

This combination was chosen because the assignment's own two-service architecture is otherwise a black box once deployed: without metrics, the only way to tell whether the backend is under load, slow, or failing is to read logs pod by pod. Prometheus and Grafana turn that into a queryable, visual signal, and Helm keeps the whole stack reproducible with a single `helm install` against a checked-in `values.yaml`.

## Known simplifications

This project targets course-assignment scope rather than production readiness. Notable simplifications, documented here rather than hidden:

* Kubernetes Secrets are committed to the repository with development credentials (`k8s/base/secret.yaml`). In a real deployment these would come from a secret manager (Sealed Secrets, External Secrets Operator, Vault), never from git.
* Single hardcoded admin user via environment variables, no database-backed user model or password hashing — sufficient for a personal, single-user tool but not a multi-tenant system.
* No database migration tool (e.g. Alembic); schema is created via `Base.metadata.create_all` at startup.
