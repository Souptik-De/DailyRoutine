import logging
from datetime import datetime, date
from app.config import get_db, DEMO_USER_ID
from app.services.vision import verify_proof_image
from app.services.sarcasm import generate_sarcastic_rejection
from app.routers.completions import mark_complete

logger = logging.getLogger(__name__)

def daily_check_attempts_collection():
    return get_db().collection("users").document(DEMO_USER_ID).collection("daily_check_attempts")

def habit_logs_collection():
    return get_db().collection("users").document(DEMO_USER_ID).collection("habit_logs")

async def process_habit_checkin(user_id: str, habit_id: str, habit_name: str, proof_hint: str, image_url: str) -> dict:
    """
    Process a proof-of-work check-in.
    Handles rate limiting, vision verification, sarcasm generation, and database updates.
    """
    if user_id != DEMO_USER_ID:
        user_id = DEMO_USER_ID

    today_str = date.today().isoformat()
    attempt_doc_id = f"{habit_id}_{today_str}"
    attempt_ref = daily_check_attempts_collection().document(attempt_doc_id)
    
    # ── Step 1: Rate limit check ──
    attempt_doc = attempt_ref.get()
    attempts = 0
    if attempt_doc.exists:
        attempts = attempt_doc.to_dict().get("attempts", 0)
        
    if attempts >= 3:
        return {
            "status": "rate_limited",
            "message": "Three strikes. Come back tomorrow with actual proof."
        }
        
    # Increment attempt counter (optimistic, but fine for this scale)
    new_attempt_count = attempts + 1
    attempt_ref.set({
        "user_id": user_id,
        "habit_id": habit_id,
        "date": today_str,
        "attempts": new_attempt_count
    }, merge=True)
    
    # ── Step 2: Vision Verification ──
    verification = await verify_proof_image(image_url, habit_name, proof_hint)
    
    is_verified = verification.get("verified", False)
    confidence = verification.get("confidence", "low")
    fraud_suspected = verification.get("fraud_suspected", False)
    verdict = verification.get("verdict", "")
    visual_context = verification.get("visual_context", "")
    
    now = datetime.utcnow().isoformat()
    log_data = {
        "user_id": user_id,
        "habit_id": habit_id,
        "photo_url": image_url,
        "verified": is_verified,
        "confidence": confidence,
        "verdict": verdict,
        "visual_context": visual_context,
        "fraud_suspected": fraud_suspected,
        "attempt_number": new_attempt_count,
        "checked_at": now
    }

    # ── Step 3: Decision Tree ──
    
    # CASE: Unclear image (low confidence) - rollback attempt count
    if confidence == "low":
        # Do not consume an attempt
        attempt_ref.update({"attempts": attempts})
        return {
            "status": "unclear",
            "message": "Image wasn't clear enough. Better lighting, closer shot. Try again."
        }
        
    # CASE: Approved
    if is_verified and confidence in ("high", "medium"):
        # Update streak/completions
        await mark_complete(today_str, habit_id)
        
        habit_logs_collection().add(log_data)
        
        return {
            "status": "approved",
            "verdict": verdict,
            "message": "Verified. Streak updated."
            # Note: The router will fetch the new streak count and attach it
        }
        
    # CASE: Fraud Detected
    if fraud_suspected:
        sarcasm = await generate_sarcastic_rejection(habit_name, verdict, visual_context, True)
        log_data["sarcastic_comment"] = sarcasm
        habit_logs_collection().add(log_data)
        
        return {
            "status": "fraud_detected",
            "sarcasticComment": sarcasm,
            "verdict": "Nice try.",
            "attemptsRemaining": 3 - new_attempt_count
        }
        
    # CASE: Rejected (not fraud, but not approved)
    if not is_verified and confidence in ("high", "medium") and not fraud_suspected:
        sarcasm = await generate_sarcastic_rejection(habit_name, verdict, visual_context, False)
        log_data["sarcastic_comment"] = sarcasm
        habit_logs_collection().add(log_data)
        
        return {
            "status": "rejected",
            "sarcasticComment": sarcasm,
            "verdict": verdict,
            "attemptsRemaining": 3 - new_attempt_count
        }

    # Fallback status
    return {
        "status": "unclear",
        "message": "Something went wrong during verification. Try again."
    }
