import os
import logging
from typing import Dict, Optional, Tuple
import numpy as np
import joblib

try:
    import torch
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

logger = logging.getLogger("mindguard-ml")

class MLService:
    _instance: Optional["MLService"] = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(MLService, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def __init__(self):
        # Prevent re-initialization if singleton instance is already setup
        if hasattr(self, "_initialized") and self._initialized:
            return
        
        self.model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "models"))
        self.nlp_model_path = os.path.join(self.model_dir, "distilbert_v1.pt")
        self.risk_model_path = os.path.join(self.model_dir, "risk_rf_v2.joblib")
        
        self.tokenizer = None
        self.emotion_model = None
        self.risk_model = None
        self.models_loaded = False
        self._initialized = True

    def load_models(self) -> None:
        """
        Loads the pre-trained NLP and Risk models from disk.
        Falls back to rule-based inference if models are not generated yet.
        """
        try:
            if not TORCH_AVAILABLE:
                logger.warning("PyTorch or Transformers not installed. Using rule-based fallback inference.")
                return

            if os.path.exists(self.nlp_model_path) and os.path.exists(self.risk_model_path):
                logger.info("Loading ML models into memory...")
                
                # 1. Load DistilBERT tokenizer and classification weights
                self.tokenizer = AutoTokenizer.from_pretrained("distilbert-base-uncased")
                self.emotion_model = AutoModelForSequenceClassification.from_pretrained(
                    "distilbert-base-uncased", num_labels=6
                )
                self.emotion_model.load_state_dict(torch.load(self.nlp_model_path, map_location=torch.device("cpu")))
                self.emotion_model.eval()

                # 2. Load Tree-based classifier
                self.risk_model = joblib.load(self.risk_model_path)
                
                self.models_loaded = True
                logger.info("ML Models successfully loaded into memory (Lifespan Startup completed).")
            else:
                logger.warning(
                    f"ML model binaries not found at:\n- {self.nlp_model_path}\n- {self.risk_model_path}\n"
                    "Starting with rule-based fallback inference."
                )
        except Exception as e:
            logger.error(f"Error loading ML models: {str(e)}. Using fallback execution.", exc_info=True)

    def _fallback_predict(self, text: str, self_reported_score: Optional[int] = None) -> Tuple[Dict[str, float], float, str]:
        """
        Heuristic rule-based fallback when model weights are not loaded.
        """
        normalized_text = text.lower()
        
        # Keyword mappings to detect emotional cues
        depressive_keywords = ["depressed", "sad", "hopeless", "overwhelmed", "lonely", "suicidal", "die", "hurt"]
        anxiety_keywords = ["anxious", "anxiety", "panic", "scared", "worried", "fear", "stress", "midterm", "exam"]
        joy_keywords = ["happy", "glad", "joy", "excited", "good", "great", "peace", "love", "smile"]

        anxiety_score = 0.1
        sadness_score = 0.1
        joy_score = 0.1
        
        # Simple counts
        for word in depressive_keywords:
            if word in normalized_text:
                sadness_score += 0.25
        for word in anxiety_keywords:
            if word in normalized_text:
                anxiety_score += 0.25
        for word in joy_keywords:
            if word in normalized_text:
                joy_score += 0.25

        # Normalize score bounds
        total = anxiety_score + sadness_score + joy_score
        anxiety = anxiety_score / total
        sadness = sadness_score / total
        joy = joy_score / total
        
        detected_emotions = {
            "anxiety": round(float(anxiety), 3),
            "sadness": round(float(sadness), 3),
            "joy": round(float(joy), 3),
            "anger": round(float(0.1 / total), 3),
            "fear": round(float(anxiety * 0.8), 3),
            "surprise": round(float(0.05 / total), 3),
        }

        # Calculate sentiment polarity (-1.0 to 1.0)
        sentiment_score = float(joy - (anxiety * 0.5 + sadness * 0.5))
        sentiment_score = max(-1.0, min(1.0, sentiment_score))

        # Core scoring heuristic: (self_reported_score is 1-10)
        subj_score = self_reported_score if self_reported_score is not None else 5
        
        # Calculate mental wellness score (0.0 to 100.0). Higher is better.
        # High sadness/anxiety lowers it; high self_reported score and joy increases it.
        base_score = subj_score * 10.0
        emotional_penalty = (anxiety * 30.0 + sadness * 40.0) - (joy * 15.0)
        
        mental_wellness_score = base_score - emotional_penalty
        mental_wellness_score = max(0.0, min(100.0, mental_wellness_score))

        # Risk classification mapping
        if mental_wellness_score < 35.0 or subj_score <= 3:
            risk_level = "HIGH"
        elif mental_wellness_score < 65.0 or subj_score <= 6:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        return detected_emotions, round(mental_wellness_score, 2), risk_level

    async def predict(
        self, text: str, self_reported_score: Optional[int] = None
    ) -> Tuple[Dict[str, float], float, str]:
        """
        Runs joint inference. 
        1. Predicts multi-label emotion probability from the text journal.
        2. Feeds emotions and contextual inputs into the Risk Assessment Classifier.
        
        Returns:
            Tuple of (detected_emotions, mental_wellness_score, risk_level)
        """
        # Execute fallback if model parameters are not loaded or torch is unavailable
        if not self.models_loaded or not TORCH_AVAILABLE:
            return self._fallback_predict(text, self_reported_score)

        try:
            # 1. Run DistilBERT inference
            inputs = self.tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128)
            with torch.no_grad():
                outputs = self.emotion_model(**inputs)
                probs = torch.softmax(outputs.logits, dim=1).numpy()[0]
            
            # Map index to class labels
            labels = ["joy", "sadness", "anxiety", "anger", "fear", "surprise"]
            detected_emotions = {labels[i]: float(probs[i]) for i in range(len(labels))}

            # Calculate sentiment polarity score
            sentiment_score = float(detected_emotions["joy"] - (detected_emotions["anxiety"] * 0.5 + detected_emotions["sadness"] * 0.5))

            # 2. Structure features array for tree model
            # Columns: [anxiety, sadness, joy, sentiment_score, self_reported_score, sleep_hours, study_hours, exam_stress_index, rolling_sentiment_7d]
            self_score = self_reported_score if self_reported_score is not None else 5
            features = np.array([[
                detected_emotions["anxiety"],
                detected_emotions["sadness"],
                detected_emotions["joy"],
                sentiment_score,
                self_score,
                7.0,  # Default sleep hours context
                5.0,  # Default study hours context
                5.0,  # Default exam stress index
                sentiment_score  # Rolling sentiment fallback
            ]])

            # Predict risk classes: 0 = Low/Medium, 1 = High
            risk_class = int(self.risk_model.predict(features)[0])
            risk_probs = self.risk_model.predict_proba(features)[0]  # [prob_low_med, prob_high]
            high_risk_probability = float(risk_probs[1])

            # Calculate continuous mental wellness score (0.0 to 100.0)
            # A higher high_risk_probability reduces the wellness score
            mental_wellness_score = (1.0 - high_risk_probability) * 100.0

            # Determine risk level category
            if risk_class == 1 or self_score <= 3:
                risk_level = "HIGH"
            elif high_risk_probability > 0.35 or self_score <= 6:
                risk_level = "MEDIUM"
            else:
                risk_level = "LOW"

            return detected_emotions, round(mental_wellness_score, 2), risk_level

        except Exception as e:
            logger.error(f"Inference exception: {str(e)}. Defaulting to fallback rules.", exc_info=True)
            return self._fallback_predict(text, self_reported_score)

ml_service = MLService()
