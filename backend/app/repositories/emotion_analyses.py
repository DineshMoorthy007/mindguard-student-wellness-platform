from app.models.emotion_analyses import EmotionAnalysis
from app.repositories.base import CRUDBase
from pydantic import BaseModel

class EmotionAnalysisRepository(CRUDBase[EmotionAnalysis, BaseModel, BaseModel]):
    pass

emotion_analysis_repository = EmotionAnalysisRepository(EmotionAnalysis)
