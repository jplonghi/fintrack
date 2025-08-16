from fastapi import APIRouter, Depends, HTTPException, Body
from app.utils import get_db
from app.schemas import Expense
from app.models import get_expenses, add_expense
from datetime import datetime
from base64 import b64decode

router = APIRouter()

@router.get("/")
def read_root():
    return {"message": "API de gastos personales en funcionamiento 🚀"}

@router.get("/expenses")
async def fetch_expenses(period: str = None, db=Depends(get_db)):
    return await get_expenses(db, period)

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

            # Default category
            category = "Default"

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
        # Ensure tags field exists
        if "tags" not in item:
            item["tags"] = []

    # Upsert the budget document
    result = await db["budgets"].update_one(
        {"period": period},
        {"$set": {
            "items": items, 
            "exchangeRate": exchangeRate
        }},
        upsert=True
    )

    return {"message": "Budget upserted successfully", "matched_count": result.matched_count}

@router.get("/budgets")
async def get_all_budgets(db=Depends(get_db)):
    # Fetch all budgets, sorted by period (most recent first)
    budgets = await db["budgets"].find().sort("period", -1).to_list(None)
    
    # Convert ObjectId to string for JSON serialization
    for budget in budgets:
        budget["_id"] = str(budget["_id"])
    
    return budgets

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

@router.get("/periods")
async def get_available_periods(db=Depends(get_db)):
    # Get unique periods from expenses collection
    periods = await db["expenses"].distinct("period")
    
    # Filter out None values and sort (most recent first)
    periods = [period for period in periods if period is not None]
    periods.sort(reverse=True)
    
    return {"periods": periods}

@router.get("/budget/{period}/details")
async def get_budget_details(period: str, db=Depends(get_db)):
    """Get budget details (items and exchange rate) without summary calculations"""
    budget = await db["budgets"].find_one({"period": period})
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found for the specified period")
    
    # Convert ObjectId to string for JSON serialization
    budget["_id"] = str(budget["_id"])
    
    return {
        "period": budget["period"],
        "exchangeRate": budget.get("exchangeRate", 600),
        "items": budget.get("items", [])
    }

@router.put("/budget/{period}")
async def update_budget(
    period: str,
    db=Depends(get_db),
    body: dict = Body(...)
):
    """Update budget items and exchange rate for a specific period"""
    exchangeRate = body.get("exchangeRate")
    items = body.get("items")
    
    if not isinstance(items, list):
        raise HTTPException(status_code=400, detail="Items must be a list")
    
    for item in items:
        if not all(key in item for key in ["category", "amount", "currency"]):
            raise HTTPException(status_code=400, detail="Invalid item structure")
        # Ensure tags field exists
        if "tags" not in item:
            item["tags"] = []
    
    # Check if budget exists
    budget = await db["budgets"].find_one({"period": period})
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found for the specified period")
    
    # Update only the items and exchange rate
    result = await db["budgets"].update_one(
        {"period": period},
        {"$set": {
            "items": items,
            "exchangeRate": exchangeRate
        }}
    )
    
    return {"message": "Budget updated successfully", "modified_count": result.modified_count}

@router.get("/categories")
async def get_available_categories(db=Depends(get_db)):
    # Get unique categories from expenses collection
    categories = await db["expenses"].distinct("category")
    
    # Filter out None/null values and sort alphabetically
    categories = [category for category in categories if category is not None and category != "N/A"]
    categories.sort()
    
    return {"categories": categories}

@router.post("/budget/{period}/recalculate")
async def recalculate_budget_categories(period: str, db=Depends(get_db)):
    """Recalculate expense categories based on budget item tags"""
    
    # Get the budget for this period
    budget = await db["budgets"].find_one({"period": period})
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found for the specified period")
    
    # Get all expenses for this period
    expenses = await db["expenses"].find({"period": period}).to_list(None)
    if not expenses:
        return {"message": "No expenses found for this period", "updated_count": 0}
    
    # Build a mapping of tags to categories from budget items
    tag_to_category = {}
    for item in budget.get("items", []):
        category = item.get("category")
        tags = item.get("tags", [])
        for tag in tags:
            tag_to_category[tag.lower()] = category
    
    # Even if no tags are found, we can still set unmatched expenses to "Default"
    updated_count = 0
    
    # Process each expense
    for expense in expenses:
        description = expense.get("description", "").lower()
        current_category = expense.get("category")
        new_category = None
        
        # Check if description contains any tag
        for tag, category in tag_to_category.items():
            if tag in description:
                new_category = category
                break
        
        # If no tag matched, set to "Default"
        if new_category is None:
            new_category = "Default"
        
        # Update expense category if category is different
        if new_category != current_category:
            await db["expenses"].update_one(
                {"_id": expense["_id"]},
                {"$set": {"category": new_category}}
            )
            updated_count += 1
    
    return {
        "message": f"Recalculation completed. {updated_count} expenses updated (categorized or set to Default).",
        "updated_count": updated_count,
        "total_expenses": len(expenses)
    }