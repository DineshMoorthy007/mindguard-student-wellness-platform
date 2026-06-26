# DOCKER.md

## 1. Containerization Strategy

MindGuard uses Docker containerization to ensure parity between local development, staging, and production environments. The application utilizes a multi-container Docker Compose setup that partitions the application into decoupled, containerized services (micro-monolith architecture).

### 1.1 Key Principles
* **Environment Parity:** The same Dockerfiles are utilized across environments. Production adjustments are managed via multi-stage builds (e.g., stripping development tools from the final production images) and environment variables.
* **Minimal Footprint:** Production base images are built using slim versions (e.g., `python:3.11-slim`, `node:20-alpine`) to reduce security attack surfaces and speed up deployments.
* **Separation of Concerns:** Each container executes a single process (Vite server, FastAPI server, Postgres daemon, or background ML pipeline task worker).

---

## 2. Docker Compose Services

Our orchestration defines four core services: `frontend`, `api`, `db`, and `ml-worker`.

```mermaid
graph TD
    subgraph Public Subnet
        client[Web Browser] -.->|HTTPS (Port 80/443)| frontend[frontend - Vite/Nginx]
        client -.->|HTTPS (Port 8000)| api[api - FastAPI/Uvicorn]
    end

    subgraph Private Subnet (No Direct Public Access)
        api -->|Internal DNS| db[(db - PostgreSQL)]
        api -->|Internal DNS| ml-worker[ml-worker - Python Task Runner]
        ml-worker --> db
    end

    %% Volumes
    db_vol[(pgdata Volume)] === db
    ml_vol[(ml_models Volume)] === ml-worker
```

### 2.1 Service Breakdown

#### 2.1.1 `frontend`
* **Technology:** Node.js Alpine (local development) / Nginx Alpine (production bundle serving).
* **Ports:** `5173` (development) / `80` (production).
* **Role:** Serves the React SPA, executing static asset loading. Calls the `api` service URL.

#### 2.1.2 `api`
* **Technology:** Python 3.11-slim, running Uvicorn + FastAPI.
* **Ports:** `8000`.
* **Role:** Serves the backend REST API, executes RBAC authorization, and delegates machine learning classification tasks asynchronously.

#### 2.1.3 `db`
* **Technology:** PostgreSQL 15-alpine.
* **Ports:** `5432` (restricted to internal container communication).
* **Role:** Stores users, journals, emotion scores, and system audit logs.

#### 2.1.4 `ml-worker`
* **Technology:** Python 3.11-slim, with HuggingFace, Scikit-learn, and Joblib installed.
* **Ports:** None exposed.
* **Role:** Processes long-running natural language evaluation queues asynchronously. Communicates directly with PostgreSQL to update analysis rows.

---

## 3. Volume Management & Persistence

Data persistence is configured using Docker named volumes to ensure container restarts do not result in data loss.

| Named Volume | Target Path in Container | Purpose | Mount Type |
| --- | --- | --- | --- |
| `pgdata` | `/var/lib/postgresql/data` | Persists user credentials, mood logs, and clinical assessments. | Named Volume |
| `ml_models` | `/app/app/ml/models` | Caches downloaded HuggingFace DistilBERT weights and serialized Scikit-learn files (`.joblib`), preventing redundant downloads. | Named Volume |
| `backend_src` | `/app` | Mounts the local `backend/` directory for live reloading during local development. | Bind Mount (Dev Only) |
| `frontend_src` | `/app` | Mounts the local `frontend/` directory for Hot Module Replacement (HMR) during local development. | Bind Mount (Dev Only) |

---

## 4. Network Isolation & Security

MindGuard restricts exposure using Docker custom networks. Rather than placing all containers on the default network bridge, the system isolates database and compute resources.

```yaml
networks:
  public-net:
    driver: bridge
  private-net:
    internal: true
```

* **`public-net`:** Includes `frontend` and `api`. This is open to ingress traffic to allow students and staff to access the platform dashboards and REST endpoints.
* **`private-net`:** Includes `api`, `db`, and `ml-worker`. The `internal: true` flag guarantees no ingress or egress routing is permitted out of this network, shielding the PostgreSQL DB and the compute-heavy ML-worker from outside intrusion.

---

## 5. Required Environment Variables

All containers configuration is managed through a root `.env` file loaded dynamically.

### 5.1 `api` and `ml-worker` Containers

| Variable Name | Example Value | Description |
| --- | --- | --- |
| `ENVIRONMENT` | `development` / `production` | Dictates debug status and CORS enforcement behavior. |
| `DATABASE_URL` | `postgresql://user:pass@db:5432/mindguard` | Connection string pointing to the PostgreSQL service. |
| `JWT_SECRET_KEY` | `super_secret_cryptographic_key_32_bytes` | Key used to sign user access and refresh tokens. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `15` | Lifetime of the access token. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Expiration limit for HttpOnly cookies. |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Authorized origin whitelist for FastAPI CORS middleware. |

### 5.2 `db` Container

| Variable Name | Example Value | Description |
| --- | --- | --- |
| `POSTGRES_USER` | `postgres` | Superuser username. |
| `POSTGRES_PASSWORD` | `secure_database_password_99` | Superuser password. |
| `POSTGRES_DB` | `mindguard` | Initial database name created on startup. |

### 5.3 `frontend` Container

| Variable Name | Example Value | Description |
| --- | --- | --- |
| `VITE_API_URL` | `http://localhost:8000/api/v1` | Target endpoint base address for Axios client requests. |
