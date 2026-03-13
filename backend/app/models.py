from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel


class JournalEntry(BaseModel):
    content: str
    date: str  # YYYY-MM-DD


class JournalEntryUpdate(BaseModel):
    content: str


class Habit(BaseModel):
    name: str
    description: Optional[str] = ""
    color: Optional[str] = "#6366f1"  # indigo default
    is_active: Optional[bool] = True
    requires_proof: Optional[bool] = False
    proof_hint: Optional[str] = ""


class HabitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None
    requires_proof: Optional[bool] = None
    proof_hint: Optional[str] = None

