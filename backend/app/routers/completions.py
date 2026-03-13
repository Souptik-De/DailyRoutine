from fastapi import APIRouter, HTTPException
from datetime import date, timedelta
from app.config import get_db, DEMO_USER_ID
import app.services.cache as cache

router = APIRouter(prefix="/api/completions", tags=["completions"])


def completions_collection():
    return get_db().collection("users").document(DEMO_USER_ID).collection("completions")


def get_all_completions_dict():
    cached = cache.get_cache("completions")
    if cached is not None:
        return cached

    docs = completions_collection().stream()
    result = {}
    for doc in docs:
        data = doc.to_dict() or {}
        completed = [habit_id for habit_id, checked in data.items() if checked is True]
        result[doc.id] = completed
        
    cache.set_cache("completions", result)
    return result


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

    comp_dict = get_all_completions_dict()
    result = {}
    current = start
    while current <= end:
        date_str = current.isoformat()
        result[date_str] = comp_dict.get(date_str, [])
        current += timedelta(days=1)

    return result


@router.get("/{date_str}")
async def get_completions_for_date(date_str: str):
    """Get all completed habit IDs for a specific date."""
    comp_dict = get_all_completions_dict()
    return {"date": date_str, "completed_habit_ids": comp_dict.get(date_str, [])}


@router.post("/test/break-streak")
async def break_streak(habit_id: str):
    """Demo endpoint: remove completions for the last 3 days to simulate a broken streak."""
    today = date.today()
    for i in range(1, 4):
        target_date = (today - timedelta(days=i)).isoformat()
        doc_ref = completions_collection().document(target_date)
        doc = doc_ref.get()
        if doc.exists:
            doc_ref.update({habit_id: False})
            
        cached = cache.get_cache("completions")
        if cached is not None and target_date in cached and habit_id in cached[target_date]:
            cached[target_date].remove(habit_id)
            cache.update_cache_in_place("completions", cached)

    # Delete the alert log for today so it can fire again!
    from app.config import get_db, DEMO_USER_ID
    alert_doc_id = f"{habit_id}_{today.isoformat()}"
    get_db().collection("users").document(DEMO_USER_ID).collection("streak_alerts").document(alert_doc_id).delete()

    # Trigger agent A to check and fire a message
    from app.services.accountability import run_accountability_check
    import asyncio
    await asyncio.to_thread(run_accountability_check)
    return {"status": "streak_broken", "habit_id": habit_id}


@router.post("/test/revert-streak")
async def revert_streak(habit_id: str):
    """Demo endpoint: add completions back for the last 3 days."""
    today = date.today()
    for i in range(1, 4):
        target_date = (today - timedelta(days=i)).isoformat()
        doc_ref = completions_collection().document(target_date)
        doc_ref.set({habit_id: True}, merge=True)
        
        cached = cache.get_cache("completions")
        if cached is not None:
            if target_date not in cached:
                cached[target_date] = []
            if habit_id not in cached[target_date]:
                cached[target_date].append(habit_id)
            cache.update_cache_in_place("completions", cached)

    return {"status": "streak_reverted", "habit_id": habit_id}


@router.post("/{date_str}/{habit_id}", status_code=200)
async def mark_complete(date_str: str, habit_id: str):
    """Mark a habit as complete on a given date."""
    doc_ref = completions_collection().document(date_str)
    doc_ref.set({habit_id: True}, merge=True)
    
    # Update cache
    cached = cache.get_cache("completions")
    if cached is not None:
        if date_str not in cached:
            cached[date_str] = []
        if habit_id not in cached[date_str]:
            cached[date_str].append(habit_id)
        cache.update_cache_in_place("completions", cached)

    return {"date": date_str, "habit_id": habit_id, "completed": True}


@router.delete("/{date_str}/{habit_id}", status_code=200)
async def mark_incomplete(date_str: str, habit_id: str):
    """Unmark a habit completion on a given date."""
    doc_ref = completions_collection().document(date_str)
    doc = doc_ref.get()
    if doc.exists:
        doc_ref.update({habit_id: False})
        
    # Update cache
    cached = cache.get_cache("completions")
    if cached is not None:
        if date_str in cached and habit_id in cached[date_str]:
            cached[date_str].remove(habit_id)
        cache.update_cache_in_place("completions", cached)

    return {"date": date_str, "habit_id": habit_id, "completed": False}

