from motor.motor_asyncio import AsyncIOMotorDatabase
from app.schemas import Expense

async def get_expenses(db: AsyncIOMotorDatabase):
    expenses = await db["expenses"].find().to_list(100)
    # Convert ObjectId to string for each document
    for expense in expenses:
        expense["_id"] = str(expense["_id"])
    return expenses

async def add_expense(db: AsyncIOMotorDatabase, expense: Expense):
    expense_dict = expense.dict()
    await db["expenses"].insert_one(expense_dict)