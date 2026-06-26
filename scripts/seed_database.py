import os
import re
import sys
import asyncio
import uuid
import random
import numpy as np
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
from sqlalchemy import text

# Add project root to path to ensure app imports resolve
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

# Load and resolve environment variable templates from .env before importing settings
dotenv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(dotenv_path)

db_url = os.environ.get("DATABASE_URL", "")

def resolve_env_vars(url: str) -> str:
    """
    Replaces ${VAR} placeholders with values from os.environ.
    """
    pattern = re.compile(r'\$\{(\w+)\}')
    while True:
        match = pattern.search(url)
        if not match:
            break
        var_name = match.group(1)
        val = os.environ.get(var_name, "")
        url = url[:match.start()] + val + url[match.end():]
    return url

# Resolve placeholders like ${POSTGRES_USER} and set environment variable
resolved_url = resolve_env_vars(db_url)

# Replace 'db' container hostname with 'localhost' if running locally outside container
if os.environ.get("ENVIRONMENT") == "development" and "@db:" in resolved_url and not os.path.exists('/.dockerenv'):
    resolved_url = resolved_url.replace("@db:", "@localhost:")

os.environ["DATABASE_URL"] = resolved_url

# Now import SQLAlchemy session and models
from app.db.session import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models.users import User, UserRole
from app.models.mood_logs import MoodLog, InputType
from app.models.emotion_analyses import EmotionAnalysis
from app.models.assessments import Assessment, RiskLevel
from app.models.alerts import Alert, AlertStatus

async def seed_database():
    print("==============================================")
    print("        Database Seeding for MindGuard        ")
    print("==============================================")
    print(f"Connecting to database: {resolved_url.split('@')[-1]}") # Print host/database info safely

    async with AsyncSessionLocal() as session:
        # Start transaction context
        async with session.begin():
            print("Cleaning up existing tables to ensure clean state...")
            # Idempotency cleanup using CASCADE truncates
            await session.execute(text("TRUNCATE TABLE alerts, emotion_analyses, assessments, mood_logs, users CASCADE"))

            print("Creating default system users...")
            # 1. Create precisely the 3 required core users
            password_hash = get_password_hash("password123")

            student = User(
                id=uuid.uuid4(),
                email="student@rit.edu",
                password_hash=password_hash,
                role=UserRole.STUDENT,
                is_active=True
            )
            counselor = User(
                id=uuid.uuid4(),
                email="counselor@rit.edu",
                password_hash=password_hash,
                role=UserRole.COUNSELOR,
                is_active=True
            )
            admin = User(
                id=uuid.uuid4(),
                email="admin@rit.edu",
                password_hash=password_hash,
                role=UserRole.ADMIN,
                is_active=True
            )
            
            session.add_all([student, counselor, admin])
            
            # Flush to database so user UUIDs are active
            await session.flush()
            print(f"Created Student: {student.email} ({student.id})")
            print(f"Created Counselor: {counselor.email} ({counselor.id})")
            print(f"Created Admin: {admin.email} ({admin.id})")

            print("\nGenerating 30 days of historical wellness data...")
            now = datetime.now(timezone.utc)
            mood_logs = []
            emotion_analyses = []
            assessments = []

            # 2. Iterate back 30 days to build a beautiful history timeline
            for i in range(30, -1, -1):
                timestamp = now - timedelta(days=i)

                # Generate self_reported_score with a wave-like volatility curve:
                # High wellness initially, dipping low in the middle (exam phase), and recovering.
                # Force specific low points on day 12 and 15 to guarantee active high risk alerts.
                if i in (12, 15):
                    self_score = 2
                else:
                    base_wave = 7.0 + 2.2 * np.cos(i / 4.5)
                    self_score = int(np.clip(base_wave + random.normalvariate(0, 0.7), 1, 10))

                mood_log_id = uuid.uuid4()
                
                # Select journal text based on subjective score
                if self_score <= 3:
                    content = "Extremely stressed and hopeless today. The workload is piling up, I feel lonely, and I cannot sleep at all."
                    input_type = InputType.TEXT
                elif self_score <= 5:
                    content = "Feeling quite tired and unmotivated. Had trouble keeping up during lectures today."
                    input_type = InputType.TEXT
                elif self_score <= 7:
                    content = "Today was average. Still feeling a bit of midterm pressure but handled my study groups fine."
                    input_type = InputType.VOICE # Mix in voice simulation
                else:
                    content = "Had an amazing day today! Slept a full 8 hours, ate healthy, and did great on my quiz."
                    input_type = InputType.TEXT

                mood_log = MoodLog(
                    id=mood_log_id,
                    student_id=student.id,
                    input_type=input_type,
                    raw_content=content,
                    self_reported_score=self_score,
                    logged_at=timestamp
                )
                mood_logs.append(mood_log)

                # 3. Simulate NLP emotions mapping
                if self_score <= 3:
                    probs = {"joy": 0.04, "sadness": 0.50, "anxiety": 0.35, "anger": 0.05, "fear": 0.04, "surprise": 0.02}
                    primary = "sadness"
                elif self_score <= 5:
                    probs = {"joy": 0.08, "sadness": 0.40, "anxiety": 0.35, "anger": 0.08, "fear": 0.05, "surprise": 0.04}
                    primary = "sadness"
                elif self_score <= 7:
                    probs = {"joy": 0.45, "sadness": 0.18, "anxiety": 0.20, "anger": 0.05, "fear": 0.05, "surprise": 0.07}
                    primary = "joy"
                else:
                    probs = {"joy": 0.80, "sadness": 0.04, "anxiety": 0.04, "anger": 0.02, "fear": 0.02, "surprise": 0.08}
                    primary = "joy"

                sentiment_score = probs["joy"] - (probs["sadness"] * 0.5 + probs["anxiety"] * 0.5)

                analysis = EmotionAnalysis(
                    id=uuid.uuid4(),
                    mood_log_id=mood_log_id,
                    detected_emotions=probs,
                    sentiment_score=sentiment_score,
                    primary_emotion=primary,
                    analyzed_at=timestamp
                )
                emotion_analyses.append(analysis)

                # 4. Generate corresponding Clinical Assessment
                wellness_score = float(self_score * 10.0 - (probs["sadness"] * 25.0 + probs["anxiety"] * 25.0))
                wellness_score = round(max(0.0, min(100.0, wellness_score)), 2)

                if wellness_score < 35.0 or self_score <= 3:
                    risk = RiskLevel.HIGH
                elif wellness_score < 65.0 or self_score <= 6:
                    risk = RiskLevel.MEDIUM
                else:
                    risk = RiskLevel.LOW

                assessment = Assessment(
                    id=uuid.uuid4(),
                    student_id=student.id,
                    mental_wellness_score=wellness_score,
                    risk_level=risk,
                    evaluated_at=timestamp
                )
                assessments.append(assessment)

            # Bulk save time series data
            session.add_all(mood_logs)
            session.add_all(emotion_analyses)
            session.add_all(assessments)
            
            # Flush so alerts can reference assessments
            await session.flush()
            print("Successfully loaded Mood logs, Emotion analyses, and clinical Assessments.")

            # 5. Generate active alerts associated with high risk markers
            high_risk_assessments = [a for a in assessments if a.risk_level == RiskLevel.HIGH]
            print(f"Flagged {len(high_risk_assessments)} high-risk assessments.")

            alerts = []
            # Create exactly 2 active alerts assigned to our counselor
            for j in range(min(2, len(high_risk_assessments))):
                high_a = high_risk_assessments[j]
                alert = Alert(
                    id=uuid.uuid4(),
                    assessment_id=high_a.id,
                    student_id=student.id,
                    counselor_id=counselor.id,
                    status=AlertStatus.PENDING,
                    created_at=high_a.evaluated_at
                )
                alerts.append(alert)

            session.add_all(alerts)
            print(f"Created {len(alerts)} pending warning Alerts assigned to Counselor: {counselor.email}")

    print("\nSUCCESS: Database successfully seeded with test vectors!")

if __name__ == "__main__":
    asyncio.run(seed_database())
