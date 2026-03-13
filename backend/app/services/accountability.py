"""
The Ruthless Accountability Coach — Two-agent notification system.

Agent A (Auditor): Scans for broken streaks (>48h since last completion).
Agent B (Enforcer): Generates personalized accountability messages via Groq.

Uses GROQ_API_KEY_2 to avoid exhausting the primary key's rate limits.
"""
import os
import time
import asyncio
import logging
from datetime import datetime, date, timedelta
from groq import Groq
from dotenv import load_dotenv
from app.config import get_db, DEMO_USER_ID

load_dotenv()

logger = logging.getLogger(__name__)

# ── Groq client (separate key for accountability agent) ────────────────────────
_api_key_2 = os.getenv("GROQ_API_KEY_2", "").strip().strip('"')
_client = Groq(api_key=_api_key_2)
_MODEL = "llama-3.1-8b-instant"

ENFORCER_SYSTEM_PROMPT = (
    "You are a brutally honest accountability coach. You do not sugarcoat. "
    "You are not mean, but you are unflinching. Your job is to write a single "
    "short notification message (max 3 sentences) that:\n"
    "- Names the exact habit that was missed and how long the streak was\n"
    "- References something SPECIFIC the user wrote in their journal that "
    "contradicts their inaction (quote or paraphrase it directly)\n"
    "- Ends with a sharp, direct call to action — not a question, a statement\n\n"
    "Tone: like a coach who believes in you but has run out of patience.\n"
    "Do NOT use generic phrases like 'you got this' or 'believe in yourself'.\n"
    "Do NOT use exclamation marks. Be specific. Be real."
)

GENERIC_FALLBACK = (
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

def audit_broken_streaks() -> list[dict]:
    """
    Scan all active habits for broken streaks (>48h since last completion).
    Returns list of payloads for Agent B. Skips habits already alerted today.
    """
    today_str = date.today().isoformat()

    # Load active habits
    habits = []
    for doc in _habits_col().stream():
        h = doc.to_dict()
        if h.get("is_active", True):
            habits.append({"id": doc.id, "name": h.get("name", ""), **h})

    if not habits:
        logger.info("[Auditor] No active habits found.")
        return []

    # Load all completions
    comp_dict = {}
    for doc in _completions_col().stream():
        data = doc.to_dict() or {}
        completed_ids = [hid for hid, checked in data.items() if checked is True]
        comp_dict[doc.id] = completed_ids

    cutoff = date.today() - timedelta(hours=48)
    payloads = []

    for habit in habits:
        habit_id = habit["id"]
        habit_name = habit["name"]

        # Find last completed date for this habit
        last_completed = None
        streak_count = 0
        sorted_dates = sorted(comp_dict.keys(), reverse=True)

        for date_str in sorted_dates:
            if habit_id in comp_dict.get(date_str, []):
                try:
                    last_completed = date.fromisoformat(date_str)
                    break
                except ValueError:
                    continue

        # Calculate what the streak was before it broke
        if last_completed:
            streak_count = 0
            check = last_completed
            while check.isoformat() in comp_dict and habit_id in comp_dict.get(check.isoformat(), []):
                streak_count += 1
                check -= timedelta(days=1)

        # Check if streak is broken (>48h since last completion)
        if last_completed and last_completed >= cutoff:
            continue  # Still active, skip
        if last_completed is None and not comp_dict:
            continue  # No completion data at all

        # Dedup: check streak_alerts for today
        alert_doc_id = f"{habit_id}_{today_str}"
        alert_ref = _streak_alerts_col().document(alert_doc_id)
        if alert_ref.get().exists:
            logger.info("[Auditor] Already alerted for %s today, skipping.", habit_name)
            continue

        payload = {
            "user_id": DEMO_USER_ID,
            "habit_id": habit_id,
            "habit_name": habit_name,
            "streak_count": streak_count,
            "last_completed_date": last_completed.isoformat() if last_completed else "never",
        }
        payloads.append(payload)
        logger.info("[Auditor] Broken streak detected: %s (%d days)", habit_name, streak_count)

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
    combined = all_entries + mention_entries[:5]
    seen_ids = set()
    unique = []
    for e in combined:
        if e["id"] not in seen_ids:
            seen_ids.add(e["id"])
            unique.append(e)

    return unique[:10], total_count


def _call_groq(user_message: str) -> str:
    """Call Groq with retry. Raises on persistent failure."""
    last_error = None
    for attempt in range(2):
        try:
            response = _client.chat.completions.create(
                model=_MODEL,
                messages=[
                    {"role": "system", "content": ENFORCER_SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.7,
                max_tokens=300,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            last_error = e
            logger.warning("[Enforcer] Groq attempt %d failed: %s", attempt + 1, e)
            if attempt == 0:
                time.sleep(5)

    raise RuntimeError(f"Groq call failed after 2 attempts: {last_error}")


def generate_accountability_message(payload: dict) -> dict | None:
    """
    Agent B: Generate a personalized accountability message and save it.

    Returns the notification dict or None on failure.
    """
    habit_name = payload["habit_name"]
    habit_id = payload["habit_id"]
    streak_count = payload["streak_count"]
    last_completed = payload["last_completed_date"]

    # Get journal context
    entries, total_count = _get_journal_context(habit_name)

    now = datetime.utcnow().isoformat()

    # If fewer than 3 journal entries, use generic fallback
    if total_count < 3:
        logger.info("[Enforcer] Too few journal entries (%d), using fallback.", total_count)
        message = GENERIC_FALLBACK.format(habit_name=habit_name, streak_count=streak_count)
        notif = _save_notification(habit_id, habit_name, streak_count, message, now)
        _save_alert(habit_id, habit_name, notif["id"])
        return notif

    # Build the user message
    entries_text = "\n".join(
        f"{i+1}. [{e.get('date', '?')}] {e.get('content', '')[:300]}"
        for i, e in enumerate(entries)
    )

    user_message = (
        f"Habit missed: {habit_name}\n"
        f"Streak that was broken: {streak_count} days\n"
        f"Last completed: {last_completed}\n\n"
        f"User's recent journal entries:\n{entries_text}\n\n"
        f"Write the notification message now."
    )

    try:
        message = _call_groq(user_message)

        # If too long, ask Groq to shorten
        if len(message) > 280:
            logger.info("[Enforcer] Message too long (%d chars), requesting shorter version.", len(message))
            shorten_msg = (
                f"This message is {len(message)} characters. Shorten it to under 280 characters "
                f"while keeping the same tone, the specific journal reference, and the call to action. "
                f"Return ONLY the shortened message:\n\n{message}"
            )
            try:
                message = _call_groq(shorten_msg)
            except Exception:
                message = message[:277] + "..."

        notif = _save_notification(habit_id, habit_name, streak_count, message, now)
        _save_alert(habit_id, habit_name, notif["id"])
        logger.info("[Enforcer] Notification saved for habit '%s'.", habit_name)
        return notif

    except Exception as e:
        logger.error("[Enforcer] Failed to generate message for '%s': %s", habit_name, e)
        return None


def _save_notification(habit_id: str, habit_name: str, streak_count: int, message: str, now: str) -> dict:
    """Save notification to Firestore."""
    doc_ref = _notifications_col().document()
    data = {
        "habit_id": habit_id,
        "habit_name": habit_name,
        "streak_count": streak_count,
        "message": message,
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

def run_accountability_check():
    """
    Main orchestration: Agent A finds broken streaks, Agent B generates messages.
    Called by the hourly scheduler and the test-trigger endpoint.
    """
    logger.info("[Orchestrator] Starting accountability check...")
    payloads = audit_broken_streaks()

    if not payloads:
        logger.info("[Orchestrator] No broken streaks found.")
        return {"checked": True, "alerts_sent": 0}

    sent = 0
    for payload in payloads:
        result = generate_accountability_message(payload)
        if result:
            sent += 1

    logger.info("[Orchestrator] Accountability check complete. Sent %d alerts.", sent)
    return {"checked": True, "alerts_sent": sent}
