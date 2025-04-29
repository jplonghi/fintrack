from fastapi import APIRouter, Depends, HTTPException, Body
from app.utils import get_db, load_rules
from app.schemas import Expense
from app.models import get_expenses, add_expense
from datetime import datetime
from base64 import b64decode

router = APIRouter()

@router.get("/")
def read_root():
    return {"message": "API de gastos personales en funcionamiento 🚀"}

@router.get("/expenses")
async def fetch_expenses(db=Depends(get_db)):
    return await get_expenses(db)

@router.post("/expenses")
async def create_expense(expense: Expense, db=Depends(get_db)):
    await add_expense(db, expense)
    return {"message": "Gasto agregado exitosamente"}

@router.post("/import")
async def import_expenses(
    db=Depends(get_db),
    body: dict = Body(...)
):
    period_identifier = body.get("period_identifier")
    raw_text = body.get("raw_text")
    if not period_identifier or not raw_text:
        raise HTTPException(status_code=400, detail="Missing required fields")

    try:
        raw_text = b64decode(raw_text).decode("utf-8")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 encoding")

    rules = load_rules()
    lines = raw_text.splitlines()
    new_expenses = []

    for line in lines:
        try:
            # Parse the line
            parts = line.split()
            date = datetime.strptime(parts[0], "%d/%m/%Y")
            description = " ".join(parts[1:-2])
            amount = float(parts[-2].replace(",", ""))
            currency = parts[-1]

            # Validate currency
            if currency not in ["CRC", "USD"]:
                continue

            # Assign category
            category = "Default"
            for rule in rules["rules"]:
                if any(keyword.lower() in description.lower() for keyword in rule["match"]):
                    category = rule["name"]
                    break

            # Check for duplicates
            existing_expense = await db["expenses"].find_one({
                "date": date,
                "description": description,
                "amount": amount,
                "currency": currency
            })
            if existing_expense:
                continue

            # Add to new expenses
            new_expenses.append({
                "date": date,
                "description": description,
                "amount": amount,
                "currency": currency,
                "category": category,
                "period": period_identifier
            })
        except Exception:
            continue  # Skip invalid lines

    # Insert new expenses
    if new_expenses:
        await db["expenses"].insert_many(new_expenses)

    return {"message": f"{len(new_expenses)} expenses imported successfully."}

@router.post("/recalculate-categories")
async def recalculate_categories(
    db=Depends(get_db),
    body: dict = Body(...)
):
    period_identifier = body.get("period_identifier")
    if not period_identifier:
        raise HTTPException(status_code=400, detail="Missing required field: period_identifier")

    rules = load_rules()

    # Fetch expenses for the given period
    expenses = await db["expenses"].find({"period": period_identifier}).to_list(1000)
    updated_count = 0

    for expense in expenses:
        description = expense["description"]
        new_category = rules["default_category"]

        # Recalculate category based on updated rules
        for rule in rules["rules"]:
            if any(keyword.lower() in description.lower() for keyword in rule["match"]):
                new_category = rule["name"]
                break

        # Update the category if it has changed
        if expense["category"] != new_category:
            await db["expenses"].update_one(
                {"_id": expense["_id"]},
                {"$set": {"category": new_category}}
            )
            updated_count += 1

    return {"message": f"Recalculated categories for {updated_count} expenses in period {period_identifier}."}

@router.get("/rules")
def fetch_rules():
    config = load_rules()
    return config.get("rules", [])

@router.post("/budget")
async def upsert_budget(
    db=Depends(get_db),
    body: dict = Body(...)
):
    period = body.get("period")
    exchangeRate = body.get("exchangeRate")
    items = body.get("items")

    if not period or not isinstance(items, list):
        raise HTTPException(status_code=400, detail="Missing or invalid fields")

    for item in items:
        if not all(key in item for key in ["category", "amount", "currency"]):
            raise HTTPException(status_code=400, detail="Invalid item structure")

    # Upsert the budget document
    result = await db["budgets"].update_one(
        {"period": period},
        {"$set": {"items": items, "exchangeRate": exchangeRate}},
        upsert=True
    )

    return {"message": "Budget upserted successfully", "matched_count": result.matched_count}

@router.get("/budget/{period}")
async def get_budget_summary(period: str, db=Depends(get_db)):
    # Fetch the budget for the given period
    budget = await db["budgets"].find_one({"period": period})
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found for the specified period")

    exchange_rate = budget.get("exchangeRate", 1)  # Default to 1 if not provided
    budget_summary = []

    for item in budget["items"]:
        category = item["category"]
        budget_amount = item["amount"]

        # Calculate the total expenses for the category in the given period
        total_expenses = await db["expenses"].aggregate([
            {"$match": {"period": period, "category": category}},
            {"$group": {"_id": "$currency", "total": {"$sum": "$amount"}}}
        ]).to_list(None)

        # Adjust total expenses based on currency
        total_expenses_converted = 0
        for expense in total_expenses:
            if expense["_id"] == "USD":
                total_expenses_converted += expense["total"] * exchange_rate
            else:
                total_expenses_converted += expense["total"]

        remaining = budget_amount - total_expenses_converted

        budget_summary.append({
            "category": category,
            "budget_amount": budget_amount,
            "total_expenses": total_expenses_converted,
            "remaining": remaining
        })

    return {"period": period, "summary": budget_summary}