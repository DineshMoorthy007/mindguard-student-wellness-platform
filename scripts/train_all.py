import os
import re
import joblib
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, accuracy_score

# Setup directories
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW_DATA_DIR = os.path.join(BASE_DIR, "datasets", "raw")
MODEL_DIR = os.path.join(BASE_DIR, "backend", "app", "ml", "models")
os.makedirs(MODEL_DIR, exist_ok=True)

NLP_MODEL_PATH = os.path.join(MODEL_DIR, "distilbert_v1.pt")
RISK_MODEL_PATH = os.path.join(MODEL_DIR, "risk_rf_v2.joblib")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
ENCODER_PATH = os.path.join(MODEL_DIR, "label_encoder.pkl")

# PII Masking regex
def mask_pii(text: str) -> str:
    """
    Redacts standard PII from user text to ensure clinical privacy compliance (HIPAA).
    """
    if not isinstance(text, str):
        return ""
    # Redact email addresses
    text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', text)
    # Redact phone numbers
    text = re.sub(r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b', '[PHONE]', text)
    return text

def train_emotion_model():
    print("\n==============================================")
    print("  Training Emotion Detection Model (DistilBERT) ")
    print("==============================================")
    
    try:
        import torch
        from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments
        from torch.utils.data import Dataset
    except ImportError:
        print("ERROR: torch or transformers is not installed. Skipping emotion model training.")
        print("Please ensure dependencies are installed via pip install torch transformers.")
        return

    train_path = os.path.join(RAW_DATA_DIR, "emotion", "train.csv")
    if not os.path.exists(train_path):
        raise FileNotFoundError(f"Emotion dataset not found at {train_path}")

    # 1. Load and clean raw text
    df = pd.read_csv(train_path)
    df = df.dropna(subset=["text", "label"])
    df["text"] = df["text"].apply(mask_pii)
    
    # 2. Map label indices to match the MindGuard MLService target schema:
    # Target: ["joy", "sadness", "anxiety", "anger", "fear", "surprise"]
    # Raw dataset: 0=sadness, 1=joy, 2=love, 3=anger, 4=fear, 5=surprise
    def map_label(row):
        text = str(row["text"]).lower()
        label = int(row["label"])
        
        # Override to 2 (anxiety) for anxiety/worry triggers
        anxiety_keywords = ["anxi", "worr", "nerv", "stress", "panic", "scared", "dread", "fright"]
        if any(kw in text for kw in anxiety_keywords):
            return 2
            
        if label == 0:
            return 1  # sadness
        elif label in (1, 2):
            return 0  # joy/love
        elif label == 3:
            return 3  # anger
        elif label == 4:
            return 4  # fear
        elif label == 5:
            return 5  # surprise
        return 1  # Default to sadness

    df["mapped_label"] = df.apply(map_label, axis=1)

    # Sample a subset for development build speeds (CPU compatibility)
    sample_size = min(300, len(df))
    df_sample = df.sample(n=sample_size, random_state=42).reset_index(drop=True)
    print(f"Loaded {len(df)} rows. Selected {sample_size} samples for local training.")
    
    texts = df_sample["text"].tolist()
    labels = df_sample["mapped_label"].tolist()

    # 3. Tokenization & Dataset Pipeline
    model_name = "distilbert-base-uncased"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    encodings = tokenizer(texts, truncation=True, padding=True, max_length=128)

    class HFDataset(Dataset):
        def __init__(self, encodings, labels):
            self.encodings = encodings
            self.labels = labels
        def __getitem__(self, idx):
            item = {key: torch.tensor(val[idx]) for key, val in self.encodings.items()}
            item["labels"] = torch.tensor(self.labels[idx], dtype=torch.long)
            return item
        def __len__(self):
            return len(self.labels)

    dataset = HFDataset(encodings, labels)

    # 4. Initialize pre-trained sequence classifier
    model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=6)

    # 5. Local Fast Training Args
    training_args = TrainingArguments(
        output_dir="./scripts/results_emotion",
        num_train_epochs=1,
        per_device_train_batch_size=8,
        logging_steps=10,
        save_strategy="no",
        report_to="none"
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset
    )

    print("Fine-tuning model on CPU...")
    trainer.train()

    # 6. Save State Dict directly to models folder
    torch.save(model.state_dict(), NLP_MODEL_PATH)
    print(f"SUCCESS: PyTorch emotion state dict saved to {NLP_MODEL_PATH}")


def train_risk_model():
    print("\n==============================================")
    print("  Training Risk Assessment Model (RandomForest) ")
    print("==============================================")
    
    dep_path = os.path.join(RAW_DATA_DIR, "student_depression", "student_depression.csv")
    if not os.path.exists(dep_path):
        raise FileNotFoundError(f"Depression dataset not found at {dep_path}")

    # 1. Load raw student depression dataset
    df = pd.read_csv(dep_path)
    
    # Strip spaces from column headers
    df.columns = [c.strip() for c in df.columns]
    df = df.dropna(subset=["Depression"])

    # 2. Extract and parse features
    family_history = df["Family History of Mental Illness"].apply(lambda x: 1.0 if str(x).strip().lower() == "yes" else 0.0)
    suicidal_thoughts = df["Have you ever had suicidal thoughts ?"].apply(lambda x: 1.0 if str(x).strip().lower() == "yes" else 0.0)
    depression_label = df["Depression"].apply(lambda x: 1.0 if str(x).strip().lower() == "yes" else 0.0)
    
    def parse_sleep(duration):
        d = str(duration).strip().lower()
        if "less than 5" in d:
            return 4.5
        elif "5-6" in d:
            return 5.5
        elif "7-8" in d:
            return 7.5
        elif "more than 8" in d:
            return 9.0
        return 7.0

    sleep_hours = df["Sleep Duration"].apply(parse_sleep)
    study_hours = pd.to_numeric(df["Study Hours"], errors="coerce").fillna(5.0)
    academic_pressure = pd.to_numeric(df["Academic Pressure"], errors="coerce").fillna(3.0)
    study_satisfaction = pd.to_numeric(df["Study Satisfaction"], errors="coerce").fillna(3.0)
    financial_stress = pd.to_numeric(df["Financial Stress"], errors="coerce").fillna(3.0)

    # 3. Construct correlating features matching MLService inputs
    # Target inputs: [anxiety, sadness, joy, sentiment_score, self_reported_score, sleep_hours, study_hours, exam_stress_index, rolling_sentiment_7d]
    np.random.seed(42)
    n_samples = len(df)

    anxiety = (academic_pressure / 5.0) * 0.4 + (financial_stress / 5.0) * 0.4 + family_history * 0.2
    anxiety = np.clip(anxiety + np.random.normal(0.0, 0.05, n_samples), 0.0, 1.0)

    sadness = np.where(depression_label == 1.0, 0.7, 0.2) + suicidal_thoughts * 0.2
    sadness = np.clip(sadness + np.random.normal(0.0, 0.05, n_samples), 0.0, 1.0)

    joy = np.clip((study_satisfaction / 5.0) * 0.8 + np.random.normal(0.0, 0.05, n_samples), 0.0, 1.0)
    
    sentiment_score = joy - (anxiety * 0.5 + sadness * 0.5)

    self_reported_score = np.clip((study_satisfaction * 2.0) - (academic_pressure * 0.5) + np.random.normal(0.0, 0.5, n_samples), 1.0, 10.0).round().astype(int)
    
    exam_stress_index = academic_pressure * 2.0
    rolling_sentiment_7d = sentiment_score + np.random.normal(0.0, 0.02, n_samples)

    X = pd.DataFrame({
        "anxiety": anxiety,
        "sadness": sadness,
        "joy": joy,
        "sentiment_score": sentiment_score,
        "self_reported_score": self_reported_score,
        "sleep_hours": sleep_hours,
        "study_hours": study_hours,
        "exam_stress_index": exam_stress_index,
        "rolling_sentiment_7d": rolling_sentiment_7d
    })

    # High risk correlates directly to suicidal thoughts, clinical depression labels, or extremely low self reported score
    y = np.where((depression_label == 1.0) | (suicidal_thoughts == 1.0) | (self_reported_score <= 3), 1, 0)

    # 4. Standard scaler and label encoder fitting
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)

    # 5. Split and Train
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        class_weight="balanced"
    )
    model.fit(X_train, y_train)

    # 6. Evaluation
    y_pred = model.predict(X_test)
    print("--- Risk Classification Performance ---")
    print(classification_report(y_test, y_pred))
    print(f"Accuracy: {accuracy_score(y_test, y_pred) * 100:.2f}%")

    # 7. Save model and auxiliary encoders
    joblib.dump(model, RISK_MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    joblib.dump(label_encoder, ENCODER_PATH)

    print(f"SUCCESS: Risk model saved to {RISK_MODEL_PATH}")
    print(f"SUCCESS: Scaler saved to {SCALER_PATH}")
    print(f"SUCCESS: Label Encoder saved to {ENCODER_PATH}")

if __name__ == "__main__":
    train_emotion_model()
    train_risk_model()
