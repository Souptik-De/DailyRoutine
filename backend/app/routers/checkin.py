import time
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import date
from collections import defaultdict
from app.config import get_db, DEMO_USER_ID
from app.services.checkin import process_habit_checkin
from app.routers.completions import mark_complete
from app.services.streak import calculate_streak

router = APIRouter(prefix="/api/habits/checkin", tags=["checkin"])

class CheckInRequest(BaseModel):
    userId: Optional[str] = DEMO_USER_ID
    habitId: str
    imageUrl: Optional[str] = None

# Simple in-memory rate limiter per IP/User to prevent abuse of the verify endpoint
_rate_limits = defaultdict(list)

def _is_rate_limited(client_id: str) -> bool:
    now = time.time()
    # Clean up old timestamps (older than 60 seconds)
    _rate_limits[client_id] = [t for t in _rate_limits[client_id] if now - t < 60]
    if len(_rate_limits[client_id]) >= 10:
        return True
    _rate_limits[client_id].append(now)
    return False

def user_habits_collection():
    return get_db().collection("users").document(DEMO_USER_ID).collection("habits")

@router.post("")
async def submit_checkin(request: Request, payload: CheckInRequest):
    client_ip = request.client.host if request.client else "unknown"
    client_id = f"{payload.userId}_{client_ip}"
    
    if _is_rate_limited(client_id):
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a minute.")

    habit_doc = user_habits_collection().document(payload.habitId).get()
    
    if not habit_doc.exists:
        raise HTTPException(status_code=404, detail="Habit not found")
        
    habit_data = habit_doc.to_dict()
    requires_proof = habit_data.get("requires_proof", False)
    habit_name = habit_data.get("name", "Unknown Habit")
    proof_hint = habit_data.get("proof_hint", "")
    
    # ── Legacy Check-in (No proof required) ──
    if not requires_proof:
        today_str = date.today().isoformat()
        await mark_complete(today_str, payload.habitId)
        streak_data = calculate_streak(payload.habitId)
        return {
            "status": "approved",
            "streakCount": streak_data.get("current_streak", 0),
            "message": "Habit completed."
        }
        
    # ── Proof of Work Check-in ──
    if requires_proof and not payload.imageUrl:
        raise HTTPException(status_code=400, detail="This habit requires photo proof.")
        
    result = await process_habit_checkin(
        user_id=payload.userId or DEMO_USER_ID,
        habit_id=payload.habitId,
        habit_name=habit_name,
        proof_hint=proof_hint,
        image_url=payload.imageUrl
    )
    
    # If approved by AI, attach the new streak count
    if result.get("status") == "approved":
        streak_data = calculate_streak(payload.habitId)
        result["streakCount"] = streak_data.get("current_streak", 0)
        
    return result
