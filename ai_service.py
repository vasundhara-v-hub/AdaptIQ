import os
import json
from dotenv import load_dotenv
from google import genai

# Load variables from .env
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")

# Create Gemini client
if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is missing from the .env file."
    )

client = genai.Client(api_key=GEMINI_API_KEY)


# =====================================================
# HELPER: CLEAN GEMINI JSON
# =====================================================

def clean_json_response(content: str):
    """Remove Markdown code fences and convert Gemini JSON to Python."""

    content = content.strip()

    if content.startswith("```json"):
        content = content[7:]

    elif content.startswith("```"):
        content = content[3:]

    if content.endswith("```"):
        content = content[:-3]

    content = content.strip()

    try:
        return json.loads(content)

    except json.JSONDecodeError as e:
        print("GEMINI JSON ERROR:")
        print(content)

        raise ValueError(
            f"Gemini returned invalid JSON: {str(e)}"
        )


# =====================================================
# NORMAL AI RESPONSE
# =====================================================

def generate_ai_response(prompt: str):
    """
    Send a normal text prompt to Gemini.
    """

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt
    )

    return response.text


# =====================================================
# GENERATE DIAGNOSTIC QUIZ
# =====================================================

def generate_quiz(prompt: str):
    """
    Generate a 5-question diagnostic quiz in JSON format.
    """

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt
    )

    quiz = clean_json_response(response.text)

    # Basic validation
    if "questions" not in quiz:
        raise ValueError(
            "Gemini response does not contain questions."
        )

    if len(quiz["questions"]) != 5:
        raise ValueError(
            f"Expected 5 questions, got {len(quiz['questions'])}."
        )

    for question in quiz["questions"]:

        if "question" not in question:
            raise ValueError(
                "Question text is missing."
            )

        if "options" not in question:
            raise ValueError(
                "Question options are missing."
            )

        if len(question["options"]) != 4:
            raise ValueError(
                "Each question must contain exactly 4 options."
            )

        if "answer" not in question:
            raise ValueError(
                "Correct answer is missing."
            )

        if question["answer"] not in question["options"]:
            raise ValueError(
                "Correct answer must be one of the options."
            )

        if "difficulty" not in question:
            raise ValueError(
                "Question difficulty is missing."
            )

    return quiz


# =====================================================
# GENERATE STUDY PLAN
# =====================================================

def generate_study_plan(prompt: str):
    """
    Generate a personalized 7-day study plan in JSON format.
    """

    response = client.models.generate_content(
        model=MODEL,
        contents=prompt
    )

    study_plan = clean_json_response(response.text)

    # Basic validation
    if "subject" not in study_plan:
        raise ValueError(
            "Study plan does not contain subject."
        )

    if "level" not in study_plan:
        raise ValueError(
            "Study plan does not contain level."
        )

    if "days" not in study_plan:
        raise ValueError(
            "Study plan does not contain days."
        )

    if len(study_plan["days"]) != 7:
        raise ValueError(
            f"Expected 7 study days, got {len(study_plan['days'])}."
        )

    for day in study_plan["days"]:

        if "day" not in day:
            raise ValueError(
                "Study day number is missing."
            )

        if "topic" not in day:
            raise ValueError(
                "Study topic is missing."
            )

        if "goal" not in day:
            raise ValueError(
                "Learning goal is missing."
            )

        if "practice" not in day:
            raise ValueError(
                "Practice activity is missing."
            )

    return study_plan

