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

## 12-Factor App

Not all 12 factors are relevant for a project this size, so only the ones actually implemented are listed below.

| # | Factor | Implementation |
|---|---|---|
| I | Codebase | One repo, two apps (`backend/`, `frontend/`), each with its own Dockerfile that builds its own image. |
| III | Config | The app code itself never hardcodes config, it only reads env vars (`app/config.py`: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_USERNAME`/`PASSWORD`, ...). |
| IV | Backing services | Postgres is only ever referenced through `DATABASE_URL`. Swapping it for a different database instance is just changing that one env var, no code touched. |
| V | Build, release, run | Build = `docker build` produces the image. Release = that image plus config for whichever environment it's run in. Run = `uvicorn`/`nginx` actually executing it. Nothing gets changed inside a running container. |
| VI | Processes | The backend keeps no session state, auth is just a JWT checked on every request. So it doesn't matter which instance ends up handling a given request. |
| IX | Disposability | `uvicorn` starts in about a second. If it can't reach Postgres at startup it exits right away instead of hanging, so it's safe for whatever's running it to just restart it, saw this happen a couple of times during testing and it recovered fine. |

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


## CNCF Technology: Prometheus, Grafana, and Helm

Installed via the [`kube-prometheus-stack`](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack) Helm chart (`k8s/monitoring/values.yaml`):

* **Prometheus** scrapes the backend's `/metrics` endpoint through a `ServiceMonitor`, collecting request counts, latency, and error rates.
* **Grafana** visualizes those metrics on an auto-provisioned dashboard.
* **Helm** installs and versions the whole stack as one reproducible release instead of hand-maintaining a pile of manifests.