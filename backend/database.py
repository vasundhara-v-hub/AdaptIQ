from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")

client = MongoClient(MONGO_URL)

db = client["LearningAssistant"]

users_collection = db["users"]
study_collection = db["study_plans"]
quiz_collection = db["quizzes"]
