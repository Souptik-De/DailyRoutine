from fastapi import APIRouter, HTTPException
from datetime import datetime
import json
from app.config import get_db, DEMO_USER_ID
from app.services.accountability import (
    run_accountability_check, 
    audit_broken_streaks, 
    generate_accountability_message
)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def notifications_collection():
    return get_db().collection("users").document(DEMO_USER_ID).collection("notifications")


@router.get("/unseen")
async def get_unseen_notifications():
    """Return all notifications where seen_at is null."""
    docs = notifications_collection().stream()
    results = []
    for doc in docs:
        data = doc.to_dict()
        if data.get("seen_at") is not None:
            continue
        data["id"] = doc.id
        results.append(data)
    # Sort by delivered_at descending
    results.sort(key=lambda x: x.get("delivered_at", ""), reverse=True)
    return results


@router.post("/{notif_id}/seen")
async def mark_seen(notif_id: str):
    """Mark a notification as seen."""
    doc_ref = notifications_collection().document(notif_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Notification not found")

    now = datetime.utcnow().isoformat()
    doc_ref.update({"seen_at": now})
    return {"id": notif_id, "seen_at": now}


@router.post("/test-trigger")
async def test_trigger():
    """
    Manually trigger Agent A to scan for broken streaks.
    Use this for testing without waiting for the hourly schedule.
    """
    result = await run_accountability_check()
    return result


@router.post("/test-fake")
async def test_fake():
    """
    Insert a fake notification to test the frontend modal.
    Bypasses the streak check entirely.
    """
    now = datetime.utcnow().isoformat()
    doc_ref = notifications_collection().document()
    data = {
        "habit_id": "test_habit",
        "habit_name": "Exercise",
        "streak_count": 7,
        "message": (
            "You wrote 'I need to prioritize my health above everything else' three days ago. "
            "Yet here you are, seven days deep into skipping Exercise. "
            "Close this modal and go move your body right now."
        ),
        "delivered_at": now,
        "seen_at": None,
    }
    doc_ref.set(data)
    return {"id": doc_ref.id, "message": "Fake notification created. Check your app."}
