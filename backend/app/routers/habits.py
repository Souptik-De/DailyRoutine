from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.config import get_db, DEMO_USER_ID
from app.models import Habit, HabitUpdate
from app.services.streak import calculate_streak
import app.services.cache as cache

router = APIRouter(prefix="/api/habits", tags=["habits"])


def habits_collection():
    return get_db().collection("users").document(DEMO_USER_ID).collection("habits")


@router.get("")
async def list_habits():
    """List all habits."""
    cached = cache.get_cache("habits")
    if cached is not None:
        return cached

    docs = habits_collection().order_by("created_at").stream()
    habits = []
    for doc in docs:
        h = doc.to_dict()
        h["id"] = doc.id
        habits.append(h)
        
    cache.set_cache("habits", habits)
    return habits


@router.post("", status_code=201)
async def create_habit(habit: Habit):
    """Create a new habit."""
    doc_ref = habits_collection().document()
    now = datetime.utcnow().isoformat()
    data = {
        "name": habit.name,
        "description": habit.description,
        "color": habit.color,
        "is_active": habit.is_active,
        "created_at": now,
        "updated_at": now,
    }
    doc_ref.set(data)
    
    # Update cache
    cached = cache.get_cache("habits")
    if cached is not None:
        cached.append({"id": doc_ref.id, **data})
        cache.set_cache("habits", cached)

    return {"id": doc_ref.id, **data}


@router.put("/{habit_id}")
async def update_habit(habit_id: str, update: HabitUpdate):
    """Update a habit's details."""
    doc_ref = habits_collection().document(habit_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Habit not found")

    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow().isoformat()
    doc_ref.update(update_data)

    updated = doc_ref.get().to_dict()
    updated["id"] = habit_id

    # Update cache
    cached = cache.get_cache("habits")
    if cached is not None:
        for h in cached:
            if h.get("id") == habit_id:
                h.update(update_data)
                break
        cache.set_cache("habits", cached)

    return updated


@router.delete("/{habit_id}", status_code=204)
async def delete_habit(habit_id: str):
    """Delete a habit (soft)."""
    doc_ref = habits_collection().document(habit_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    now = datetime.utcnow().isoformat()
    doc_ref.update({
        "is_active": False,
        "updated_at": now
    })

    # Update cache
    cached = cache.get_cache("habits")
    if cached is not None:
        for h in cached:
            if h.get("id") == habit_id:
                h["is_active"] = False
                h["updated_at"] = now
                break
        cache.set_cache("habits", cached)

    return None


@router.get("/{habit_id}/streak")
async def get_streak(habit_id: str):
    """Get current and longest streak for a habit."""
    # To reduce reads, check cache instead of hitting DB if possible
    cached = cache.get_cache("habits")
    if cached is not None:
        if not any(h.get("id") == habit_id for h in cached):
            raise HTTPException(status_code=404, detail="Habit not found")
    else:
        doc_ref = habits_collection().document(habit_id)
        doc = doc_ref.get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Habit not found")

    streak_data = calculate_streak(habit_id)
    return {"habit_id": habit_id, **streak_data}
