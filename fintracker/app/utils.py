import json
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import Depends
import os

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client["expense_tracker"]

def get_db():
    return db

def load_rules():
    with open("app/config.json", "r") as file:
        config = json.load(file)
    return config