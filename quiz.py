
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from services.ai_service import generate_quiz
from database import quiz_collection
from auth_utils import get_current_user

router = APIRouter()


class QuizRequest(BaseModel):
    subject: str
    syllabus: str


@router.post("/quiz/generate")
def generate_quiz_endpoint(
    request: QuizRequest,
    current_user: dict = Depends(get_current_user)
):
    prompt = f"""
Create a diagnostic quiz based ONLY on the syllabus below.

Subject: {request.subject}

Syllabus:
{request.syllabus}

Create exactly 5 multiple-choice questions.

Each question must contain:
- question
- options: exactly 4 options
- answer: the correct option text
- difficulty: Easy, Medium, or Hard

Return ONLY valid JSON in exactly this format:

{{
    "subject": "{request.subject}",
    "questions": [
        {{
            "question": "question text",
            "options": [
                "option 1",
                "option 2",
                "option 3",
                "option 4"
            ],
            "answer": "correct option",
            "difficulty": "Easy"
        }}
    ]
}}
"""

    try:
        quiz = generate_quiz(prompt)
        return quiz

    except Exception as e:
        print("QUIZ GENERATION ERROR:", repr(e))

        raise HTTPException(
            status_code=503,
            detail=f"Gemini API error: {str(e)}"
        )


class QuizSubmission(BaseModel):
    questions: list
    answers: list


@router.post("/quiz/submit")
def submit_quiz(
    submission: QuizSubmission,
    current_user: dict = Depends(get_current_user)
):
    total_questions = len(submission.questions)

    if total_questions == 0:
        raise HTTPException(
            status_code=400,
            detail="No quiz questions were submitted."
        )

    if len(submission.answers) != total_questions:
        raise HTTPException(
            status_code=400,
            detail="Number of answers does not match number of questions."
        )

    correct_answers = 0

    for i in range(total_questions):
        correct_answer = submission.questions[i]["answer"]
        student_answer = submission.answers[i]

        if student_answer == correct_answer:
            correct_answers += 1

    percentage = (correct_answers / total_questions) * 100

    if percentage <= 40:
        level = "Beginner"
    elif percentage <= 70:
        level = "Intermediate"
    else:
        level = "Advanced"

    result = {
        "user_id": current_user["user_id"],
        "total_questions": total_questions,
        "correct_answers": correct_answers,
        "score": f"{correct_answers}/{total_questions}",
        "percentage": percentage,
        "recommended_level": level
    }

    inserted = quiz_collection.insert_one(result)

    return {
        "total_questions": total_questions,
        "correct_answers": correct_answers,
        "score": f"{correct_answers}/{total_questions}",
        "percentage": percentage,
        "recommended_level": level,
        "id": str(inserted.inserted_id),
        "user_id": current_user["user_id"]
    }

