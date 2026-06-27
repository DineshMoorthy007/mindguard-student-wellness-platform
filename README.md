# MindGuard: Student Wellness and Mental Health Platform

<p align="center">
  <img src="https://img.shields.io/badge/Version-1.0.0-blue.svg?style=for-the-badge" alt="Version 1.0.0">
  <img src="https://img.shields.io/badge/Python-3.11-3776AB.svg?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.11">
  <img src="https://img.shields.io/badge/FastAPI-0.100.0%2B-009688.svg?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/React-18.2-61DAFB.svg?style=for-the-badge&logo=react&logoColor=black" alt="React 18.2">
  <img src="https://img.shields.io/badge/TypeScript-5.2-3178C6.svg?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5.2">
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.3-38B2AC.svg?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/PostgreSQL-15-4169E1.svg?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL 15">
  <img src="https://img.shields.io/badge/Docker-Enabled-2496ED.svg?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/HIPAA-PII_Masked-green.svg?style=for-the-badge&logo=shield" alt="HIPAA Compliant">
</p>

---

## 1. Project Overview

MindGuard is a proactive, digital mental health and psychological support platform designed specifically for academic institutions. Unlike traditional mental health resources that are reactive (responding only after a student reaches crisis), MindGuard establishes a secure, continuous, and intelligent check-in ecosystem.

By combining self-guided tracking tools, standardized clinical surveys, and advanced asynchronous NLP emotion-detection pipelines, MindGuard facilitates early distress detection and provides actionable, real-time insights for both students and university counseling staff.

---

## 2. Core Features

- **Dual-Input Student Journals:** Secure, daily self-reflection submissions using both structured text or simulated voice transcripts.
- **Standardized Clinical Diagnostics:** Interactive, periodic implementation of validated questionnaires:
  - PHQ-9 (Patient Health Questionnaire for depression severity assessment)
  - GAD-7 (Generalized Anxiety Disorder questionnaire)
- **Multi-Engine AI/ML Pipeline:**
  - Fine-tuned DistilBERT (HuggingFace Transformers) mapping journal text to emotional states.
  - Custom Random Forest and XGBoost classifier mapping emotional vectors and clinical metrics to a quantified Mental Wellness Score (0-100) and risk tier.
  - Named Entity Recognition (NER) pipeline for real-time PII (Personally Identifiable Information) masking.
- **The Decision Diamond Router:** Automated routing based on risk stratification:
  - **Low Risk:** Personalized self-help resources, mindfulness articles, and content-based recommendations.
  - **Medium Risk:** Interactive coping exercises, breathing guides, and cognitive behavioral therapy (CBT) modules.
  - **High Risk:** Direct counselor escalation, real-time notification alerts, and placement in the triage queue.
- **Role-Based Portals:**
  - **Student Portal:** Daily logging, history analytics graphs, and recommendations.
  - **Counselor Portal:** Alert management board, patient risk logs, and contact outreach logging.
  - **Institution Portal:** Aggregated, fully anonymized wellness analytics to identify macro-trends without violating student privacy.

---

## 3. System Architecture

MindGuard utilizes a decoupled, N-tier micro-monolith architectural pattern configured for complete environment parity and backend-to-frontend safety.

### 3.1 Component Architecture Diagram

The system partitions user interaction from compute-heavy machine learning calculations. This ensures synchronous operations (like auth or log loads) remain non-blocking.

```mermaid
graph TD
    %% Client Layer
    subgraph ClientLayer ["Client Layer"]
        Web["Web App - React/Tailwind"]
        Mobile["Mobile App - PWA/Flutter"]
    end

    %% Gateway Layer
    Gateway["FastAPI API Gateway"]

    %% Internal Micro-services
    subgraph BackendServices ["Backend Services"]
        Auth["Authentication Service"]
        Mood["Mood Tracking Service"]
        Wellness["Wellness Analytics Engine"]
        Notify["Notification Service"]
    end

    %% AI / ML Processing
    subgraph ProcessingLayer ["Processing Layer"]
        Sentiment["Sentiment Analysis"]
        Emotion["Emotion Detection Engine"]
        Risk["Risk Assessment Engine"]
        Recommend["Recommendation Engine"]
    end

    %% Database
    subgraph DataLayer ["Data Layer"]
        DB[("PostgreSQL")]
    end

    %% Dashboard Outputs
    subgraph Dashboards ["Dashboards"]
        StudentDash["Student Dashboard"]
        CounselorDash["Counselor Dashboard"]
        AdminDash["Institution Dashboard"]
    end

    %% Flow Connections
    Web -->|HTTPS or REST| Gateway
    Mobile -->|HTTPS or REST| Gateway

    Gateway --> Auth
    Gateway --> Mood
    Gateway --> Wellness
    Gateway --> Notify

    Mood --> ProcessingLayer
    ProcessingLayer --> DB
    
    Auth --> DB
    Wellness --> DB
    Notify --> DB

    DB --> Dashboards
```

### 3.2 Network Isolation and Subnet Security Diagram

To maintain strict compliance and prevent data leaks, MindGuard segregates communication into a dual-network configuration:

```mermaid
graph TD
    subgraph PublicSubnet ["Public Subnet (Internet Facing)"]
        client["Web Browser"] -.->|HTTPS Port 80 and 443| frontend["frontend Container - Vite/Nginx"]
        client -.->|HTTPS Port 8000| api["api Container - FastAPI/Uvicorn"]
    end

    subgraph PrivateSubnet ["Private Subnet (Isolated Internal Network)"]
        api -->|Internal DNS| db[("db Container - PostgreSQL 15")]
        api -->|Internal DNS| ml-worker["ml-worker Container - Task Runner"]
        ml-worker --> db
    end

    %% Volumes
    db_vol[("pgdata Volume")] === db
    ml_vol[("ml_models Volume")] === ml-worker
```

---

## 4. Platform Workflow (How it Works)

### 4.1 Daily Check-In and Evaluation Lifecycle

When a student checks in, data undergoes sequential sanitization, classification, scoring, and routing:

```mermaid
sequenceDiagram
    participant Student as "Student (Web/Mobile)"
    participant API as "FastAPI Backend"
    participant ML as "Processing Layer"
    participant DB as "PostgreSQL"
    participant Counselor as "Counselor Dashboard"

    Student->>API: Submit Text/Voice Entry
    API->>API: Mask PII (NER Regex Engine)
    API->>DB: Save Raw Input (Pending Analysis)
    API->>ML: Trigger Emotion Analysis Task
    ML->>ML: Run NLP & Sentiment Analysis (DistilBERT)
    ML->>ML: Calculate Mental Wellness Score (RandomForest/XGBoost)
    ML->>DB: Update DB with Score & Categorization
    
    alt is Low Risk
        API-->>Student: Return Self-Help Resources & Articles
    else is Medium Risk
        API-->>Student: Return Guided Wellness Activities & coping skills
    else is High Risk
        API->>API: Trigger Notification Service
        API-->>Counselor: Dispatch Alert + Counselor Triage Referral
        API-->>Student: Acknowledge & Recommend Immediate Support Contacts
    end
```

### 4.2 Authentication Flow

Authentication is managed via JSON Web Tokens (JWT) using short-lived Access Tokens (15-30 minutes) and HttpOnly secure Refresh Cookies.

```mermaid
sequenceDiagram
    participant Client as "React App"
    participant Gateway as "API Gateway"
    participant Auth as "Auth Service"
    participant DB as "PostgreSQL"

    Client->>Gateway: POST /api/v1/auth/login (Credentials)
    Gateway->>Auth: Forward Credentials
    Auth->>DB: Query User Record
    DB-->>Auth: Return User & Password Hash
    Auth->>Auth: Verify Password Hash (bcrypt)
    Auth->>Auth: Generate JWT (Access + Refresh Tokens)
    Auth-->>Gateway: Return JWT Tokens
    Gateway-->>Client: 200 OK (Tokens in Response / HttpOnly Cookie)
    
    Note over Client,Gateway: Subsequent Requests
    Client->>Gateway: GET /api/v1/mood/history (Bearer Token)
    Gateway->>Gateway: Validate JWT Signature
    Gateway->>Gateway: Authorize Role (Student/Counselor/Admin)
    Gateway->>Mood Service: Forward Request (Authorized)
```

---

## 5. Quick Start and Execution (How to Run)

MindGuard supports running either fully containerized (recommended) or in a manual local setup.

### 5.1 Environment Configuration
Before executing any setup, copy the root environment variables file:

```bash
# Copy root env template
cp .env.example .env
```

Ensure your root `.env` (located at [.env](.env)) matches the following parameters:

```ini
PROJECT_NAME="MindGuard API"
VERSION="1.0.0"
ENVIRONMENT="development"

# PostgreSQL Database Configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=mindguard_secure_pass
POSTGRES_DB=mindguard
POSTGRES_SERVER=db
POSTGRES_PORT=5432
DATABASE_URL=postgresql+asyncpg://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_SERVER}:${POSTGRES_PORT}/${POSTGRES_DB}

# Security / JWT
SECRET_KEY=very_secret_development_key_change_in_prod
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# Frontend Configuration
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

### Option A: Containerized Execution (Docker Compose)

This is the fastest method to stand up the entire platform. It configures and links PostgreSQL, the FastAPI API, the ML Worker, and the React frontend.

> [!IMPORTANT]
> Make sure Docker and Docker Compose are installed and running on your system.

#### 1. Build and Run the Stack
Run the following command from the root directory:
```bash
docker-compose up --build
```

This starts:
- **Frontend SPA:** accessible at `http://localhost:5173`
- **FastAPI backend API:** accessible at `http://localhost:8000` (interactive Swagger UI available at `http://localhost:8000/docs`)
- **PostgreSQL Database:** operating internally on port `5432` (secured from host exposure)
- **ML Worker:** background loop listener caching model parameters

#### 2. Run Database Migrations (Inside Container)
To initialize the schema in PostgreSQL, run the Alembic migrations inside the API container:
```bash
docker-compose exec api alembic upgrade head
```

#### 3. Seed Mock Data (Inside Container)
To populate the database with 30 days of historical data for tests:
```bash
docker-compose exec api python scripts/seed_database.py
```

#### 4. Run Model Training (Inside Container)
To pre-train the classification models using the dataset vectors:
```bash
docker-compose exec api python scripts/train_all.py
```

---

### Option B: Manual Local Setup (Host Machine)

If you are developing and want live hot-reloading outside containers, run the services on your host machine.

#### Prerequisites
- **Python** 3.11.x (installed and added to PATH)
- **Node.js** 20.x+ & **npm** (installed)
- **PostgreSQL** 15+ (running locally)

---

#### 1. Setup Backend
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv .venv
   # Windows PowerShell
   .venv\Scripts\Activate.ps1
   # macOS/Linux
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Copy the backend `.env` configuration file:
   ```bash
   cp .env.example .env
   ```
   > [!NOTE]
   > Update the `DATABASE_URL` in `backend/.env` to point to your local PostgreSQL instance (e.g., `postgresql+asyncpg://postgres:password@localhost:5432/mindguard`).

5. Run Alembic Migrations:
   ```bash
   alembic upgrade head
   ```

6. Pre-Train the ML Models:
   The backend models must be trained before startup to prevent loading errors during the API's lifespan event. Run the training script:
   ```bash
   python ../scripts/train_all.py
   ```
   *This trains the HuggingFace sequence classification model and the RandomForest/XGBoost risk models, exporting them into the backend/app/ml/models folder.*

7. Seed test users:
   ```bash
   python ../scripts/seed_database.py
   ```

8. Start the FastAPI development server:
   ```bash
   python main.py
   ```
   *The backend starts at `http://localhost:8000`.*

---

#### 2. Setup Frontend
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```
3. Copy the frontend env configuration file:
   ```bash
   cp .env.example .env
   ```
4. Run the Vite development server:
   ```bash
   npm run dev
   ```
   *The frontend starts at `http://localhost:5173`.*

---

### 5.3 Default Seeding Credentials

After running [scripts/seed_database.py](scripts/seed_database.py), the database will be preloaded with the following users for logging in:

| Email Address | Role | Password | Description |
| --- | --- | --- | --- |
| `student@rit.edu` | Student | `password123` | Log in to check journals, see mood graphs, and take PHQ-9. |
| `counselor@rit.edu` | Counselor | `password123` | Log in to manage triage lists, view alerts, and track outreach status. |
| `admin@rit.edu` | Admin | `password123` | Log in to view aggregated school analytics and reports. |

---

## 6. Machine Learning Pipeline (In Depth)

The ML pipeline is partitioned into two distinct engines to perform comprehensive NLP classification and structural clinical assessment.

```mermaid
graph TD
    %% Input
    Input["Raw Text Journal Entry"] --> PII["PII Masking Engine - NER Regex"]
    PII --> Tokenizer["DistilBERT Tokenizer"]
    
    %% Emotion Engine
    subgraph EmotionDetectionEngine ["Emotion Detection Engine"]
        Tokenizer --> DistilBERT["Fine-tuned DistilBERT Classifier"]
        DistilBERT --> Emotions["Emotion Probability Vector <br> joy, sadness, anxiety, anger, fear, surprise"]
    end
    
    %% Risk Engine
    subgraph RiskAssessmentEngine ["Risk Assessment Engine"]
        Emotions --> FeatureEng["Feature Engineering <br> Volatility, exam index, rolling average"]
        Survey["Survey Metrics <br> PHQ-9 / GAD-7 scores"] --> FeatureEng
        FeatureEng --> Scaler["StandardScaler"]
        Scaler --> RandomForest["XGBoost & RandomForest Classifier"]
        RandomForest --> RiskScore["Mental Wellness Score <br> 0 - 100"]
        RandomForest --> RiskTier["Risk Category <br> Low, Medium, High"]
    end

    %% Action Output
    RiskTier --> DecisionDiamond{Risk Stratification}
    DecisionDiamond -->|Low| SelfHelp["Self-help Resources"]
    DecisionDiamond -->|Medium| Coping["Guided Coping Activities"]
    DecisionDiamond -->|High| Warning["Counselor Alert Queue"]
```

### 6.1 Data Preprocessing & PII Masking
To comply with health informatics regulations (e.g., HIPAA), all qualitative inputs are processed through a Named Entity Recognition (NER) masking regex. Identifiers like student names, email addresses, and phone numbers are mapped to redacted labels (e.g., `[EMAIL]`, `[PHONE]`) before text reaches the models.

### 6.2 Model Versioning & MLflow
- Models are trained using the PyTorch ecosystem (for NLP) and Scikit-learn/XGBoost (for risk assessment).
- Saved model binary configurations (`.pt` and `.joblib`) are stored in AWS S3 and versioned using an MLflow Model Registry.
- During local dev, models are loaded from backend/app/ml/models.

---

## 7. Deployment & CI/CD Guidelines

Production orchestration uses continuous integration and fully managed hosting services.

### 7.1 AWS Production Topology
- **Routing:** AWS Route 53 routes client DNS lookups to an Application Load Balancer (ALB).
- **SSL Termination:** The ALB terminates SSL certificate handshakes and routes traffic internally.
- **Compute:** The frontend (served via Nginx container) and api (served via FastAPI) run inside an **AWS ECS Fargate** cluster, utilizing serverless CPU/Memory scaling.
- **Database:** A fully managed **AWS RDS PostgreSQL** multi-AZ cluster operates inside private subnets, restricting traffic only to authorized backend security groups.
- **Storage:** Amazon EBS volumes persist PostgreSQL logs, and Amazon S3 acts as the cache repository for ML models and assets.

### 7.2 CI/CD Pipeline Workflow (GitHub Actions)
- On code push or pull request merge:
  1. **Lint & Test:** Runs unit and integration test blocks using `pytest` for backend and `Jest` for frontend.
  2. **Dockerization:** Builds Docker images using multi-stage pipelines to minimize size.
  3. **Registry:** Pushes production images to AWS Elastic Container Registry (ECR).
  4. **Deploy:** Updates the ECS tasks, performing a rolling deployment without downtime.

---

## 8. Project Structure

```text
mindguard-student-wellness-platform/
├── .agent/                 # Agent workspace utilities and skills
├── .github/                # GitHub pipelines (CI/CD workflows)
├── backend/                # FastAPI Application and ML codebase
│   ├── alembic/            # Database migration configurations
│   ├── app/
│   │   ├── api/            # API Gateway routes / REST endpoints
│   │   ├── core/           # Security, configuration, and exception modules
│   │   ├── db/             # SQLAlchemy configurations and models
│   │   ├── ml/             # Emotion engine, pipelines, and inference handlers
│   │   ├── models/         # SQLAlchemy relational database entities
│   │   ├── schemas/        # Pydantic validation classes
│   │   └── services/       # Core business logic handlers
│   ├── requirements.txt    # Python backend dependencies
│   ├── Dockerfile          # Production backend Docker image config
│   └── main.py             # Server entry point
├── datasets/               # Preloaded dataset CSV files
│   ├── raw/
│   │   ├── emotion/
│   │   └── student_depression/
│   └── processed/
├── docs/                   # Detailed architectural documentation
├── frontend/               # React SPA client codebase
│   ├── src/
│   │   ├── components/     # UI elements (shadcn/ui layout wrappers)
│   │   ├── hooks/          # React Query API fetch calls
│   │   ├── pages/          # Student, Counselor, and Admin portals
│   │   └── services/       # Axios API integration setups
│   ├── Dockerfile          # Frontend container configurations
│   ├── tailwind.config.js  # Styling frameworks
│   └── package.json        # Frontend NPM configurations
├── scripts/                # Utility execution scripts
│   ├── seed_database.py    # Database cleanup and seeding script
│   └── train_all.py        # ML training initialization script
├── docker-compose.yml      # Service orchestration config
└── README.md               # Main project overview and run book
```

---

## 9. Documentation Index

The complete design specifications, threat models, and developer guides are located within the docs directory:

| Document | Purpose |
| --- | --- |
| [PRD.md](docs/PRD.md) | Product Requirements Document outlining target metrics, goals, and user stories. |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architectural layout, component designs, and API Sequence diagrams. |
| [DATABASE.md](docs/DATABASE.md) | ER diagrams, table schema fields, UUID constraints, and indexing. |
| [API.md](docs/API.md) | Complete endpoints matrix, request schemas, and JSON error codes. |
| [BACKEND.md](docs/BACKEND.md) | Backend layered N-tier code guidelines, error boundaries, and configs. |
| [FRONTEND.md](docs/FRONTEND.md) | Component architecture, state management rules, routing, and UI designs. |
| [ML.md](docs/ML.md) | ML preprocessing details, model structures, evaluation criteria, and registries. |
| [SECURITY.md](docs/SECURITY.md) | Security logs, JWT lifecycles, and PII HIPAA-compliant masking rules. |
| [DOCKER.md](docs/DOCKER.md) | Docker Compose configurations, persistent storage setups, and network bridges. |
| [TESTING.md](docs/TESTING.md) | Unit, integration, and E2E testing guides along with coverage metrics. |
| [ROADMAP.md](docs/ROADMAP.md) | Project roadmap phases, future wearable integrations, and SaaS options. |

---

## 10. License

This project is licensed under the MIT License - see the LICENSE file for details.
