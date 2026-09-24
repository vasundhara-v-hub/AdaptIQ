from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import users_collection
from pwdlib import PasswordHash
from dotenv import load_dotenv


import jwt
import os
from datetime import datetime, timedelta, timezone

load_dotenv()
router = APIRouter()

password_hash = PasswordHash.recommended()

JWT_SECRET = os.getenv("JWT_SECRET", "adaptiq-development-secret")
JWT_ALGORITHM = "HS256"


# -----------------------------
# REQUEST MODELS
# -----------------------------

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    goal: str
    subjects: list[str]


class LoginRequest(BaseModel):
    email: str
    password: str


# -----------------------------
# REGISTER
# -----------------------------

@router.post("/register")
def register(user_data: RegisterRequest):

    # Check whether email already exists
    existing_user = users_collection.find_one({
        "email": user_data.email.lower()
    })

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="An account with this email already exists."
        )

    # Hash password before storing it
    hashed_password = password_hash.hash(user_data.password)

    user = {
        "name": user_data.name,
        "email": user_data.email.lower(),
        "password": hashed_password,
        "goal": user_data.goal,
        "subjects": user_data.subjects,
        "created_at": datetime.now(timezone.utc)
    }

    result = users_collection.insert_one(user)

    return {
        "message": "Registration successful",
        "user_id": str(result.inserted_id)
    }


# -----------------------------
# LOGIN
# -----------------------------

@router.post("/login")
def login(user_data: LoginRequest):

    user = users_collection.find_one({
        "email": user_data.email.lower()
    })

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Verify password against stored hash
    if not password_hash.verify(
        user_data.password,
        user["password"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Create JWT token
    payload = {
        "user_id": str(user["_id"]),
        "email": user["email"],
        "name": user["name"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=24)
    }

    token = jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )

    return {
        "message": "Login successful",
        "access_token": token,
        "token_type": "bearer",
        "user_id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"]
    }