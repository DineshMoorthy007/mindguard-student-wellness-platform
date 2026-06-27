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
        depressive_keywords = ["depressed", "sad", "hopeless", "overwhelmed", "lonely", "suicidal", "die", "hurt", "gloom", "miserable"]
        anxiety_keywords = ["anxious", "anxiety", "panic", "scared", "worried", "fear", "stress", "midterm", "exam", "burnout", "overload"]
        joy_keywords = [
            "happy", "glad", "joy", "excited", "good", "great", "peace", "love", "smile", "pleasant", "present",
            "fine", "ok", "okay", "nice", "cool", "peaceful", "relaxed", "chill", "productive", "well",
            "positive", "enjoy", "enjoyed", "wonderful", "awesome"
        ]

        # Use a high-joy default baseline so neutral texts default to positive/stable scores
        anxiety_score = 0.05
        sadness_score = 0.05
        joy_score = 0.70
        
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
        # If score is default (5) or None, dynamically estimate it from text sentiment
        subj_score = self_reported_score
        if subj_score is None or subj_score == 5:
            subj_score = int(round(5.5 + sentiment_score * 4.5))
            subj_score = max(1, min(10, subj_score))
        
        # Calculate mental wellness score (0.0 to 100.0). Higher is better.
        base_score = subj_score * 10.0
        emotional_penalty = (anxiety * 30.0 + sadness * 40.0) - (joy * 15.0)
        
        mental_wellness_score = base_score - emotional_penalty
        mental_wellness_score = max(0.0, min(100.0, mental_wellness_score))

        # Risk classification mapping based on wellness score boundaries
        if mental_wellness_score < 40.0:
            risk_level = "HIGH"
        elif mental_wellness_score < 70.0:
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

            # Mix in rule-based keyword signals to boost sensitivity to specific triggers
            normalized_text = text.lower()
            depressive_keywords = ["depressed", "sad", "hopeless", "overwhelmed", "lonely", "suicidal", "die", "hurt", "gloom", "miserable"]
            anxiety_keywords = ["anxious", "anxiety", "panic", "scared", "worried", "fear", "stress", "midterm", "exam", "burnout", "overload"]
            joy_keywords = [
                "happy", "glad", "joy", "excited", "good", "great", "peace", "love", "smile", "pleasant", "present",
                "fine", "ok", "okay", "nice", "cool", "peaceful", "relaxed", "chill", "productive", "well",
                "positive", "enjoy", "enjoyed", "wonderful", "awesome"
            ]

            dep_hits = sum(1 for w in depressive_keywords if w in normalized_text)
            anx_hits = sum(1 for w in anxiety_keywords if w in normalized_text)
            joy_hits = sum(1 for w in joy_keywords if w in normalized_text)

            if dep_hits > 0:
                detected_emotions["sadness"] = min(1.0, detected_emotions["sadness"] + 0.25 * dep_hits)
                detected_emotions["joy"] = max(0.0, detected_emotions["joy"] - 0.20 * dep_hits)
            if anx_hits > 0:
                detected_emotions["anxiety"] = min(1.0, detected_emotions["anxiety"] + 0.25 * anx_hits)
                detected_emotions["joy"] = max(0.0, detected_emotions["joy"] - 0.15 * anx_hits)
            if joy_hits > 0:
                detected_emotions["joy"] = min(1.0, detected_emotions["joy"] + 0.25 * joy_hits)
                detected_emotions["sadness"] = max(0.0, detected_emotions["sadness"] - 0.15 * joy_hits)
                detected_emotions["anxiety"] = max(0.0, detected_emotions["anxiety"] - 0.15 * joy_hits)

            # Normalize adjusted emotions so they sum to 1
            total_prob = sum(detected_emotions.values())
            if total_prob > 0:
                detected_emotions = {k: float(v / total_prob) for k, v in detected_emotions.items()}

            # Calculate sentiment polarity score
            sentiment_score = float(detected_emotions["joy"] - (detected_emotions["anxiety"] * 0.5 + detected_emotions["sadness"] * 0.5))
            sentiment_score = max(-1.0, min(1.0, sentiment_score))

            # 2. Structure features array for tree model
            # If self_reported_score is default (5) or None, dynamically estimate it from text sentiment
            self_score = self_reported_score
            if self_score is None or self_score == 5:
                self_score = int(round(5.5 + sentiment_score * 4.5))
                self_score = max(1, min(10, self_score))

            # Columns: [anxiety, sadness, joy, sentiment_score, self_reported_score, sleep_hours, study_hours, exam_stress_index, rolling_sentiment_7d]
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
            # Base wellness score calibrated by text-derived self score
            base_wellness = self_score * 10.0
            emotional_penalty = (detected_emotions["anxiety"] * 30.0 + detected_emotions["sadness"] * 40.0) - (detected_emotions["joy"] * 15.0)
            mental_wellness_score = base_wellness - emotional_penalty

            # Adjust score using classifier predictions to keep them aligned
            if risk_class == 1:
                mental_wellness_score = min(mental_wellness_score, 39.0)
            elif high_risk_probability > 0.35:
                mental_wellness_score = min(mental_wellness_score, 69.0)
                
            mental_wellness_score = max(0.0, min(100.0, mental_wellness_score))

            # Determine risk level category based on ML model predictions
            if risk_class == 1 or mental_wellness_score < 40.0:
                risk_level = "HIGH"
            elif high_risk_probability > 0.35 or mental_wellness_score < 70.0:
                risk_level = "MEDIUM"
            else:
                risk_level = "LOW"

            return detected_emotions, round(mental_wellness_score, 2), risk_level

        except Exception as e:
            logger.error(f"Inference exception: {str(e)}. Defaulting to fallback rules.", exc_info=True)
            return self._fallback_predict(text, self_reported_score)

ml_service = MLService()
