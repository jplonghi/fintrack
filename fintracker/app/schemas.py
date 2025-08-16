from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Expense(BaseModel):
    date: datetime
    description: str
    amount: float
    currency: str
    category: Optional[str] = None
    period: Optional[str] = None

class BudgetItem(BaseModel):
    category: str
    amount: float
    currency: str
    tags: List[str] = []

class Budget(BaseModel):
    period: str
    exchangeRate: float
    items: List[BudgetItem]