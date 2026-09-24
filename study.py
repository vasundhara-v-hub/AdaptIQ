from fastapi import APIRouter, Depends
from pydantic import BaseModel

from services.ai_service import generate_study_plan as ai_generate_study_plan
from database import study_collection
from auth_utils import get_current_user


router = APIRouter()


class StudyPlanRequest(BaseModel):
    subject: str
    syllabus: str
    score: int
    total_questions: int
    level: str


@router.post("/study-plan/generate")
def generate_study_plan(
    request: StudyPlanRequest,
    current_user: dict = Depends(get_current_user)
):
    prompt = f"""
You are an AI personalized learning assistant.

Create a personalized study plan for a student based on their syllabus
and diagnostic quiz performance.

Subject: {request.subject}

Syllabus:
{request.syllabus}

Quiz Score: {request.score}/{request.total_questions}

Recommended Level: {request.level}

Create a 7-day study plan.

The plan should:
- Match the student's recommended level.
- Focus more on topics the student needs to learn.
- Include a topic for each day.
- Include a short learning goal.
- Include a practice activity.
- Keep the workload realistic for a student.

Return ONLY valid JSON in this format:

{{
    "subject": "{request.subject}",
    "level": "{request.level}",
    "days": [
        {{
            "day": 1,
            "topic": "topic name",
            "goal": "learning goal",
            "practice": "practice activity"
        }}
    ]
}}
"""

    study_plan = ai_generate_study_plan(prompt)

    study_plan["user_id"] = current_user["user_id"]

    inserted = study_collection.insert_one(study_plan)

    return {
        "subject": study_plan["subject"],
        "level": study_plan["level"],
        "days": study_plan["days"],
        "id": str(inserted.inserted_id),
        "user_id": current_user["user_id"]
    }

