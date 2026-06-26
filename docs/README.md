# MindGuard Student Wellness Platform

MindGuard is a digital mental health and psychological support platform designed for academic institutions. By combining self-guided tracking tools with advanced NLP emotion-detection pipelines, MindGuard facilitates early distress detection and provides actionable insights for both students and counselor staff.

---

## 1. Core Problem & Solution

### The Challenge
University students experience high levels of stress, anxiety, and depressive symptoms, often exacerbated by academic schedules, financial strain, and social adjustment. Traditional mental health resources are often reactive, responding only after a student reaches a point of crisis.

### The Solution
MindGuard bridges this gap by offering a proactive, secure, and intuitive check-in ecosystem:
1. **Student Check-ins:** Students submit daily journals via text or voice, alongside standardized clinical questionnaires (PHQ-9, GAD-7).
2. **Asynchronous NLP Pipeline:** DistilBERT analyzes journals for emotional signatures, and XGBoost correlates these with demographic and academic indicators to compute a dynamic Mental Wellness Score.
3. **Tiered Interventions:** Low and medium-risk assessments route students to self-help modules. High-risk assessments trigger real-time notification alerts on the counselor queue for early clinical outreach.

---

## 2. Technology Stack

MindGuard is built on a robust, decoupled stack designed for security, auditability, and performant machine learning inference.

* **Frontend:**
  * React.js (TypeScript) SPA initialized with Vite.
  * Responsive layout styled with TailwindCSS & Radix UI primitives (`shadcn/ui`).
  * Server synchronization managed using React Query (TanStack).
* **Backend:**
  * FastAPI (Python) implementing a layered (N-Tier) architecture.
  * Uvicorn ASGI application server.
  * SQLAlchemy ORM utilizing PostgreSQL.
* **ML Processing Layer:**
  * HuggingFace Transformers (fine-tuned DistilBERT) for emotion detection.
  * XGBoost & Scikit-learn for risk level regression.
  * Named Entity Recognition (NER) for PII redaction.
* **Database & Queue:**
  * PostgreSQL (relying on UUID v4 and JSONB metrics storage).
* **DevOps & Infrastructure:**
  * Docker & Docker Compose for containerized environment replication.
  * GitHub Actions for automated CI/CD unit testing pipelines.

---

## 3. Quick Start & Local Development

Follow these steps to run a local containerized instance of MindGuard.

### Prerequisites
* Ensure you have [Docker](https://www.docker.com/products/docker-desktop/) and Docker Compose installed.
* Python 3.11+ and Node 20+ (optional, for local development outside containers).

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-institution/mindguard.git
cd mindguard
```

### Step 2: Environment Configuration
Copy the template configuration files and customize their secrets:
```bash
# In the repository root
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```
Ensure you set secure values for `JWT_SECRET_KEY` and the `POSTGRES_PASSWORD` fields.

### Step 3: Launch Services
Boot up the isolated multi-container system:
```bash
docker-compose up --build
```
This command builds and deploys:
* **Frontend SPA:** accessible at `http://localhost:5173`
* **API REST Backend:** accessible at `http://localhost:8000`
* **PostgreSQL DB:** on port `5432` (restricted to internal networks)
* **ML Inference Worker:** running background task polling

---

## 4. Documentation Index

The complete design specifications for MindGuard are located within the `docs/` folder:

| File Name | Description |
| --- | --- |
| [PRD.md](file:///d:/1_Hackathons/Biothon/mindguard-student-wellness-platform/docs/PRD.md) | Product Requirements Document detailing user personas, features, and target metrics. |
| [ARCHITECTURE.md](file:///d:/1_Hackathons/Biothon/mindguard-student-wellness-platform/docs/ARCHITECTURE.md) | High-level and Low-level system design, sequence diagrams, and request lifecycles. |
| [DATABASE.md](file:///d:/1_Hackathons/Biothon/mindguard-student-wellness-platform/docs/DATABASE.md) | ER diagrams, table schemas, UUID constraints, and data type specifications. |
| [API.md](file:///d:/1_Hackathons/Biothon/mindguard-student-wellness-platform/docs/API.md) | Endpoint endpoints documentation for Auth, Student checks, and Counselor interfaces. |
| [BACKEND.md](file:///d:/1_Hackathons/Biothon/mindguard-student-wellness-platform/docs/BACKEND.md) | Layered code structure guidelines, repository patterns, and core Python dependencies. |
| [FRONTEND.md](file:///d:/1_Hackathons/Biothon/mindguard-student-wellness-platform/docs/FRONTEND.md) | Component trees, routing layouts, state management strategy, and React Query rules. |
| [ML.md](file:///d:/1_Hackathons/Biothon/mindguard-student-wellness-platform/docs/ML.md) | Datasets description, feature engineering, pipeline architecture, and ML model details. |
| [SECURITY.md](file:///d:/1_Hackathons/Biothon/mindguard-student-wellness-platform/docs/SECURITY.md) | Threat modeling, JWT security lifecycles, RBAC constraints, and PII masking mechanisms. |
| [DOCKER.md](file:///d:/1_Hackathons/Biothon/mindguard-student-wellness-platform/docs/DOCKER.md) | Container configurations, private networking, persistent volume storage, and environment variables. |
| [TESTING.md](file:///d:/1_Hackathons/Biothon/mindguard-student-wellness-platform/docs/TESTING.md) | Pytest overrides, Jest/React Testing Library setup, ML evaluation boundaries, and CI workflows. |
| [ROADMAP.md](file:///d:/1_Hackathons/Biothon/mindguard-student-wellness-platform/docs/ROADMAP.md) | Four development phases, future scope features, and institutional SaaS business models. |
