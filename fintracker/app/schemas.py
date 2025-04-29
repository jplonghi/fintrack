from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Expense(BaseModel):
    date: datetime
    description: str
    amount: float
    currency: str
    category: Optional[str] = None