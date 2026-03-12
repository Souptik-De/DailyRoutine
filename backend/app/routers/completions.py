from fastapi import APIRouter, HTTPException
from datetime import date, timedelta
from app.config import get_db, DEMO_USER_ID

router = APIRouter(prefix="/api/completions", tags=["completions"])


def completions_collection():
    return get_db().collection("users").document(DEMO_USER_ID).collection("completions")


@router.get("/range")
async def get_completions_range(start_date: str, end_date: str):
    """
    Get all completions within a date range (YYYY-MM-DD).
    Returns a dict keyed by date with lists of completed habit IDs.
    """
    try:
        start = date.fromisoformat(start_date)
        end = date.fromisoformat(end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    result = {}
    current = start
    while current <= end:
        date_str = current.isoformat()
        doc = completions_collection().document(date_str).get()
        if doc.exists:
            data = doc.to_dict() or {}
            completed = [habit_id for habit_id, checked in data.items() if checked is True]
            result[date_str] = completed
        else:
            result[date_str] = []
        current += timedelta(days=1)

    return result


@router.get("/{date_str}")
async def get_completions_for_date(date_str: str):
    """Get all completed habit IDs for a specific date."""
    doc = completions_collection().document(date_str).get()
    if not doc.exists:
        return {"date": date_str, "completed_habit_ids": []}

    data = doc.to_dict() or {}
    completed = [habit_id for habit_id, checked in data.items() if checked is True]
    return {"date": date_str, "completed_habit_ids": completed}


@router.post("/{date_str}/{habit_id}", status_code=200)
async def mark_complete(date_str: str, habit_id: str):
    """Mark a habit as complete on a given date."""
    doc_ref = completions_collection().document(date_str)
    doc_ref.set({habit_id: True}, merge=True)
    return {"date": date_str, "habit_id": habit_id, "completed": True}


@router.delete("/{date_str}/{habit_id}", status_code=200)
async def mark_incomplete(date_str: str, habit_id: str):
    """Unmark a habit completion on a given date."""
    doc_ref = completions_collection().document(date_str)
    doc = doc_ref.get()
    if doc.exists:
        doc_ref.update({habit_id: False})
    return {"date": date_str, "habit_id": habit_id, "completed": False}
