from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.auth import router as auth_router
from routes.study import router as study_router
from routes.quiz import router as quiz_router

app = FastAPI(
    title="AdaptIQ - AI Personalized Learning Assistant",
    description="AI-powered personalized learning platform",
    version="1.0.0"
)

# Allow frontend to connect with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Main routes
app.include_router(auth_router)
app.include_router(study_router)
app.include_router(quiz_router)


@app.get("/")
def home():
    return {
        "message": "AdaptIQ AI Learning Assistant Backend Running"
    }