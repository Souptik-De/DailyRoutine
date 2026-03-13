import os
import time
import asyncio
import json
import logging
from datetime import datetime, date, timedelta
from typing import cast, List, Dict, Any
from groq import AsyncGroq
from dotenv import load_dotenv
from app.config import get_db, DEMO_USER_ID

load_dotenv()

logger = logging.getLogger(__name__)

# ── Groq client (separate key for accountability agent) ────────────────────────
_api_key_2 = os.getenv("GROQ_API_KEY_2", "").strip().strip('"')
_client = AsyncGroq(api_key=_api_key_2)
_MODEL = "llama-3.3-70b-versatile"

ENFORCER_SYSTEM_PROMPT = (
    "You are a brutally honest accountability coach. You do not sugarcoat. "
    "You are not mean, but you are unflinching. Your job is to write a single "
    "short notification message (max 3 sentences) that:\n"
    "- Names the exact habit that was missed and how long the streak was\n"
    "- References something SPECIFIC the user wrote in their journal that "
    "contradicts their inaction\n"
    "- Ends with a sharp, direct call to action — not a question, a statement\n\n"
    "Tone: like a coach who believes in you but has run out of patience.\n"
    "Do NOT use generic phrases like 'you got this' or 'believe in yourself'.\n"
    "Do NOT use exclamation marks. Be specific. Be real.\n\n"
    "Crucially: DO NOT explicitly quote the user's journal entry in your message. Just allude to it directly as a fact. "
    "The UI will display the referenced journal below your message automatically.\n\n"
    "You MUST output ONLY a valid JSON object with the following structure:\n"
    "{\n"
    "  \"message\": \"<the accountability message>\",\n"
    "  \"referenced_journal_id\": \"<the ID of the journal entry you referenced, or null>\"\n"
    "}"
)

GENERIC_FALLBACK_MSG = (
    "You broke your {habit_name} streak of {streak_count} days. "
    "No journal context to reference — but you know what you committed to. "
    "Get back on it today."
)


# ── Firestore helpers ──────────────────────────────────────────────────────────

def _user_ref():
    return get_db().collection("users").document(DEMO_USER_ID)


def _notifications_col():
    return _user_ref().collection("notifications")


def _streak_alerts_col():
    return _user_ref().collection("streak_alerts")


def _journals_col():
    return _user_ref().collection("journals")


def _habits_col():
    return _user_ref().collection("habits")


def _completions_col():
    return _user_ref().collection("completions")


# ── Agent A — The Auditor ──────────────────────────────────────────────────────

from app.services.streak import calculate_streak

def audit_broken_streaks() -> list[dict]:
    """
    Scan all active habits for broken streaks or same-day inaction.
    Trigger A: If the habit is not completed today.
    Uses identical logic to the dashboard for streak counting.
    """
    today_iso = date.today().isoformat()
    
    # Load active habits
    habits = []
    for doc in _habits_col().stream():
        h = doc.to_dict()
        if h and h.get("is_active", True):
            habits.append({"id": doc.id, "name": h.get("name", "Unnamed Habit")})

    if not habits:
        logger.info("[Auditor] No active habits found.")
        return []

    # Map dates to habits completed on that date
    comp_dict = {}
    for doc in _completions_col().stream():
        data = doc.to_dict() or {}
        comp_dict[doc.id] = [hid for hid, checked in data.items() if checked is True]

    payloads = []
    for habit in habits:
        h_id = habit["id"]
        h_name = habit["name"]

        # 1. Dashboard logic for streak
        streak_data = calculate_streak(h_id)
        current_streak = streak_data["current_streak"]

        # 2. Check if completed today
        is_completed_today = h_id in comp_dict.get(today_iso, [])
        
        # Trigger if NOT completed today. 
        # This covers "streak goes to 1" (first day missed) and "streak goes to 0" (broken).
        if is_completed_today:
            continue

        # Find the last completion date for context in the prompt
        last_date_str = "never"
        valid_dates = sorted([d for d in comp_dict.keys() if len(d) == 10], reverse=True)
        for d_str in valid_dates:
            if h_id in comp_dict[d_str]:
                last_date_str = d_str
                break

        # 3. "Do not stop the notification for any reason"
        # We REMOVE the check for existing streak_alerts for today to allow continuous pressure.
        # This will trigger Agent B every time the orchestrator runs until the habit is marked done.

        # 4. Success! Build the payload for Agent B
        entries, total_count = _get_journal_context(str(h_name))
        payloads.append({
            "user_id": DEMO_USER_ID,
            "habit_id": h_id,
            "habit_name": str(h_name),
            "streak_count": current_streak,
            "last_completed_date": last_date_str,
            "journal_entries": entries,
            "journal_total_count": total_count,
        })
        logger.info("[Auditor] Inaction detected for %s. Streak status: %d", h_name, current_streak)

    return payloads


# ── Agent B — The Enforcer ─────────────────────────────────────────────────────

def _get_journal_context(habit_name: str) -> tuple[list[dict], int]:
    """
    Fetch recent journal entries + entries mentioning the habit.
    Returns (entries_for_prompt, total_entry_count).
    """
    all_entries = []
    for doc in _journals_col().order_by("date", direction="DESCENDING").limit(10).stream():
        entry = doc.to_dict()
        entry["id"] = doc.id
        all_entries.append(entry)

    total_count = len(list(_journals_col().stream()))

    # Also find entries mentioning the habit name (simple contains)
    mention_entries = []
    for doc in _journals_col().stream():
        entry = doc.to_dict()
        content = entry.get("content", "").lower()
        if habit_name.lower() in content and doc.id not in [e["id"] for e in all_entries]:
            entry["id"] = doc.id
            mention_entries.append(entry)

    # Merge, dedup, limit to 10
    combined = all_entries + list(mention_entries)[:5]
    seen_ids = set()
    unique = []
    for e in combined:
        if e["id"] not in seen_ids:
            seen_ids.add(e["id"])
            unique.append(e)

    return list(unique)[:10], total_count


async def _call_groq(user_message: str):
    """Call Groq with standard completion. Returns full string."""
    try:
        completion = await _client.chat.completions.create(
            model=_MODEL,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": ENFORCER_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.7,  # Restore stable temperature
            max_tokens=500
        )
        return completion.choices[0].message.content or ""
    except Exception as e:
        logger.error(f"Groq API call failed: {e}")
        return ""


async def generate_accountability_message(payload: dict) -> dict | None:
    """
    Agent B: Generate a personalized accountability message and save it.

    Returns the notification dict or None on failure.
    """
    habit_name = payload["habit_name"]
    habit_id = payload["habit_id"]
    streak_count = payload["streak_count"]
    last_completed = payload["last_completed_date"]
    
    # Extract bundled context from Payload A
    entries = payload.get("journal_entries", [])
    total_count = payload.get("journal_total_count", 0)
    entries_by_id = {e["id"]: e for e in entries}

    now = datetime.utcnow().isoformat()

    # If fewer than 3 journal entries, use generic fallback
    if total_count < 3:
        logger.info("[Enforcer] Too few journal entries (%d), using fallback.", total_count)
        msg_text = GENERIC_FALLBACK_MSG.format(habit_name=habit_name, streak_count=streak_count)
        notif = _save_notification(habit_id, habit_name, streak_count, msg_text, None, now)
        _save_alert(habit_id, habit_name, notif["id"])
        return notif

    # Build the user message
    entries_text = "\n".join(
        f"ID: {e.get('id')} | Date: {e.get('date', '?')} | Content: {e.get('content', '')[:300]}"
        for e in entries
    )

    user_message = (
        f"Habit missed: {habit_name}\n"
        f"Streak that was broken: {streak_count} days\n"
        f"Last completed: {last_completed}\n\n"
        f"User's recent journal entries:\n{entries_text}\n\n"
        f"Write the notification message now, and provide the exact ID of the journal entry you referenced in the JSON."
    )

    try:
        raw_response_str = cast(str, await _call_groq(user_message))
        logger.info(f"Raw response: {raw_response_str}")
        
        parsed = json.loads(raw_response_str.strip())
        message_text = parsed.get("message", "")
        ref_id = parsed.get("referenced_journal_id")

        journal_ref = None
        if ref_id and ref_id in entries_by_id:
            e = entries_by_id[ref_id]
            journal_ref = {
                "id": e["id"],
                "date": e.get("date"),
                "content": e.get("content", ""),
                "content_snippet": e.get("content", "")[:100] + "..." if len(e.get("content", "")) > 100 else e.get("content", "")
            }

        notif = _save_notification(habit_id, habit_name, streak_count, message_text, journal_ref, now)
        _save_alert(habit_id, habit_name, notif["id"])
        logger.info("[Enforcer] Notification saved for habit '%s'.", habit_name)
        return notif

    except Exception as e:
        logger.error("[Enforcer] Failed to generate message for '%s': %s", habit_name, e)
        return None


def _save_notification(habit_id: str, habit_name: str, streak_count: int, message: str, journal_ref: dict | None, now: str) -> dict:
    """Save notification to Firestore."""
    doc_ref = _notifications_col().document()
    data = {
        "habit_id": habit_id,
        "habit_name": habit_name,
        "streak_count": streak_count,
        "message": message,
        "journal_reference": journal_ref,
        "delivered_at": now,
        "seen_at": None,
    }
    doc_ref.set(data)
    return {"id": doc_ref.id, **data}


def _save_alert(habit_id: str, habit_name: str, notification_id: str):
    """Log to streak_alerts to prevent duplicate notifications."""
    today_str = date.today().isoformat()
    alert_doc_id = f"{habit_id}_{today_str}"
    _streak_alerts_col().document(alert_doc_id).set({
        "habit_id": habit_id,
        "habit_name": habit_name,
        "notification_id": notification_id,
        "fired_at": datetime.utcnow().isoformat(),
    })


# ── Orchestrator ───────────────────────────────────────────────────────────────

def run_accountability_check_sync():
    """
    Synchronous wrapper for run_accountability_check, since the router uses BackgroundTasks which needs a sync wrapper or exact async await.
    """
    asyncio.run(run_accountability_check())

async def run_accountability_check():
    """
    Main orchestration: Agent A finds broken streaks, Agent B generates messages.
    Called by the hourly scheduler and the test-trigger endpoint.
    """
    logger.info("[Orchestrator] Starting accountability check...")
    payloads = await asyncio.to_thread(audit_broken_streaks)

    if not payloads:
        logger.info("[Orchestrator] No broken streaks found.")
        return {"checked": True, "alerts_sent": 0}

    sent = 0
    # Process the LLM calls concurrently to speed things up tremendously
    tasks = [generate_accountability_message(payload) for payload in payloads]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    for result in results:
        if isinstance(result, dict):
            sent += 1

    logger.info("[Orchestrator] Accountability check complete. Sent %d alerts.", sent)
    return {"checked": True, "alerts_sent": sent}
