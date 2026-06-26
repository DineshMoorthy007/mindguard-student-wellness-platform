import os
from typing import Dict, List, Tuple
import torch
from torch.utils.data import Dataset
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments, EvalPrediction
import numpy as np
from sklearn.metrics import f1_score, accuracy_score

# Target output model path
MODEL_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
OUTPUT_MODEL_PATH = os.path.join(MODEL_DIR, "distilbert_v1.pt")

class EmotionDataset(Dataset):
    def __init__(self, encodings: Dict[str, torch.Tensor], labels: List[int]):
        self.encodings = encodings
        self.labels = labels

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        item = {key: val[idx].clone().detach() for key, val in self.encodings.items()}
        item["labels"] = torch.tensor(self.labels[idx], dtype=torch.long)
        return item

    def __len__(self) -> int:
        return len(self.labels)

def mask_pii(text: str) -> str:
    """
    Placeholder for Named Entity Recognition (NER) to redact names,
    locations, dates, and ID numbers before tokenization.
    """
    # Placeholder: In production, integrate spaCy or a transformer NER model
    return text

def load_data(data_path: str) -> Tuple[List[str], List[int]]:
    """
    Load raw emotion data from csv/text formats.
    """
    # Boilerplate loading logic
    texts = ["I feel completely overwhelmed by exams", "I am very happy today", "I feel anxious and sad"]
    labels = [2, 0, 1]  # mapped to emotion labels
    
    # Preprocess text (mask PII)
    texts = [mask_pii(t) for t in texts]
    return texts, labels

def compute_metrics(p: EvalPrediction) -> Dict[str, float]:
    preds = np.argmax(p.predictions, axis=1)
    macro_f1 = f1_score(p.label_ids, preds, average="macro")
    acc = accuracy_score(p.label_ids, preds)
    return {
        "accuracy": acc,
        "macro_f1": macro_f1
    }

def train_model(data_path: str) -> None:
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    # 1. Load data
    texts, labels = load_data(data_path)
    
    # 2. Tokenization
    model_name = "distilbert-base-uncased"
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    encodings = tokenizer(texts, truncation=True, padding=True, max_length=128, return_tensors="pt")
    
    # Convert encodings to list-like structure for pytorch Dataset
    encodings_dict = {key: val for key, val in encodings.items()}
    
    dataset = EmotionDataset(encodings_dict, labels)
    
    # 3. Model setup
    model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=6) # 6 primary emotions
    
    # 4. Training configuration
    training_args = TrainingArguments(
        output_dir="./results",
        num_train_epochs=3,
        per_device_train_batch_size=8,
        per_device_eval_batch_size=8,
        warmup_steps=100,
        weight_decay=0.01,
        logging_dir="./logs",
        logging_steps=10,
        evaluation_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="macro_f1"
    )
    
    # 5. Trainer execution
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
        eval_dataset=dataset,
        compute_metrics=compute_metrics
    )
    
    trainer.train()
    
    # 6. Save full model state dict
    torch.save(model.state_dict(), OUTPUT_MODEL_PATH)
    print(f"Model successfully saved to {OUTPUT_MODEL_PATH}")

if __name__ == "__main__":
    # Specify default training data path
    train_model(data_path="datasets/raw/goemotions")
