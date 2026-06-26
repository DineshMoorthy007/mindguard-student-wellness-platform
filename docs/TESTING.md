# TESTING.md

## 1. Monorepo Testing Strategy

MindGuard uses a multi-tier testing strategy to ensure software reliability, machine learning model correctness, and dashboard user experience. Due to the sensitive nature of student mental health assessments, we enforce strict test boundaries across all system layers.

```mermaid
graph TD
    subgraph Client Testing
        jest[Jest Unit Tests]
        rtl[React Testing Library (RTL) UI Tests]
    end

    subgraph Server Testing
        pytest[Pytest Unit Tests]
        integration[API Integration Tests]
        mockdb[Test DB Override & Mock Session]
    end

    subgraph ML Pipeline Testing
        boundary[Inference Boundary Tests]
        eval[Offline Model Evaluation Pipeline]
    end

    jest --> CI[GitHub Actions CI Workflow]
    rtl --> CI
    pytest --> CI
    integration --> CI
    boundary --> CI
    eval --> Registry[ML Model Registry]
```

---

## 2. Backend Testing (FastAPI & Pytest)

We use **Pytest** for backend testing, isolating database transactions and mocking external integrations to guarantee fast execution and clean state.

### 2.1 Test Database Overriding
During unit testing, the system overrides the production PostgreSQL database with a localized database session. A Pytest fixture drops and recreates all tables before each test execution block.

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db.session import Base
from app.main import app
from app.api.dependencies import get_db

TEST_DATABASE_URL = "postgresql://postgres:pass@localhost:5432/test_mindguard"
engine = create_engine(TEST_DATABASE_URL)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    # Setup: Create tables
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        # Teardown: Drop tables
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    from fastapi.testclient import TestClient
    yield TestClient(app)
    app.dependency_overrides.clear()
```

### 2.2 Dependency Injection Mocking
FastAPI’s Dependency Injection system is fully leveraged during test execution to mock security checks or external notifications. For example, mocking the authentication layer allows testing endpoints with dummy user credentials.

```python
def test_get_student_profile_authorized(client):
    # Mock authentication token validation
    client.app.dependency_overrides[get_current_user] = lambda: User(
        id="u-1111-2222", email="student@test.edu", role="STUDENT"
    )
    
    response = client.get("/api/v1/students/me")
    assert response.status_code == 200
    assert response.json()["email"] == "student@test.edu"
```

---

## 3. Frontend Testing (Jest & React Testing Library)

Frontend testing ensures that UI widgets render correctly and validate state flows based on React Query responses.

### 3.1 Component and Hook Testing
* **Jest:** Manages our test runner, mock configurations, and assertion libraries.
* **React Testing Library (RTL):** Tests components in a way that simulates real user interactions (e.g., typing into a journal textbox, selecting a score, clicking submit).

### 3.2 UI Test Example
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MoodCheckInPanel from '../components/MoodCheckInPanel';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

describe('MoodCheckInPanel', () => {
  it('should display validation errors when submitting empty journal entries', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <MoodCheckInPanel />
      </QueryClientProvider>
    );

    const submitButton = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/journal text cannot be empty/i)).toBeInTheDocument();
    });
  });
});
```

---

## 4. Machine Learning & Inference Testing

Testing machine learning models requires monitoring statistical behaviors and testing edge-case strings to guarantee clinical safety.

### 4.1 Evaluation Pipeline Metrics
Our offline evaluation scripts measure:
* **Recall (Sensitivity):** We require a threshold of **$\ge 95\%$** on the test dataset for the high-risk classification category. Missing an at-risk student represents a critical failure.
* **Macro F1-Score:** Measures classification accuracy across all 27 emotion classes (GoEmotions corpus) to verify neutral, anxious, and depressive vocabulary detection.

### 4.2 Inference Boundary Testing
In addition to traditional dataset cross-validation, we run regression tests against a curated list of edge-case statements to ensure consistent categorization.

* **Extreme Negatives:** Text expressing immediate risk (e.g., self-harm keywords) must always trigger a `HIGH_RISK` assessment.
* **Ambivalent Phrases:** Text that mixes sentiments (e.g., "I'm okay, but school makes me feel so hopeless") is validated to verify that the risk engine prioritizes the distressed sentiment rather than averaging them out.
* **Empty / Non-sensical Input:** Inputs consisting of single characters or gibberish are tested to ensure they trigger validation errors rather than returning random low or high-risk assessments.

---

## 5. CI/CD Integration (GitHub Actions)

We automate test suite execution using GitHub Actions on every Pull Request (PR) targeted at the `main` branch. A PR cannot be merged unless all stages pass successfully.

```yaml
name: CI Testing Pipeline

on:
  pull_request:
    branches: [ main ]

jobs:
  backend-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_mindguard
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.11"
      - name: Install dependencies
        run: |
          pip install -r backend/requirements.txt
          pip install pytest httpx
      - name: Run Pytest
        run: pytest backend/tests

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: "20"
      - name: Install dependencies
        run: npm ci --prefix frontend
      - name: Run Jest Tests
        run: npm test --prefix frontend
```
