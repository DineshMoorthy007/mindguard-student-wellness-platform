from app.models.assessments import RiskLevel
from app.schemas.recommendations import RecommendationActivity, RecommendationResponse

class RecommendationService:
    def get_recommendations_for_profile(
        self,
        risk_level: RiskLevel,
        primary_emotion: str
    ) -> RecommendationResponse:
        """
        Decision Matrix: Maps student assessments to contextual suggestions.
        Supports high-privacy filtering without sharing data across peers.
        """
        activities = []
        
        if risk_level == RiskLevel.HIGH:
            activities = [
                RecommendationActivity(
                    type="SUPPORT",
                    title="Contact 24/7 Immediate Campus Crisis Support",
                    url="https://mindguard.edu/support/immediate"
                ),
                RecommendationActivity(
                    type="APPOINTMENT",
                    title="Schedule Urgent Session with Clinic Counselor",
                    url="https://mindguard.edu/appointments/counselor"
                )
            ]
        elif risk_level == RiskLevel.MEDIUM:
            if primary_emotion in ["anxiety", "fear"]:
                activities = [
                    RecommendationActivity(
                        type="MINDFULNESS",
                        title="5-Minute Deep Breathing Exercise Video",
                        url="https://cdn.mindguard.edu/media/breathe.mp4"
                    ),
                    RecommendationActivity(
                        type="ARTICLE",
                        title="Coping with Academic Exam Burnout",
                        url="https://mindguard.edu/resources/burnout"
                    )
                ]
            else:
                activities = [
                    RecommendationActivity(
                        type="MEDITATION",
                        title="Guided Mindful Grounding Audio Session",
                        url="https://cdn.mindguard.edu/media/grounding.mp4"
                    ),
                    RecommendationActivity(
                        type="ARTICLE",
                        title="Optimizing Sleep Schedules for Stress Reduction",
                        url="https://mindguard.edu/resources/sleep"
                    )
                ]
        else:  # LOW risk
            activities = [
                RecommendationActivity(
                    type="ARTICLE",
                    title="Campus Work-Life Balance Guidelines",
                    url="https://mindguard.edu/resources/balance"
                ),
                RecommendationActivity(
                    type="VIDEO",
                    title="Daily Student Self-Care Habits and Routines",
                    url="https://cdn.mindguard.edu/media/selfcare.mp4"
                )
            ]

        return RecommendationResponse(risk_level=risk_level, activities=activities)

recommendation_service = RecommendationService()
