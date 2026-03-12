"""
DailyRoutine - Demo Data Seeder
Populates Firebase Firestore with 16+ days of demo data for demo_user_001.

Run with: python seed_data.py (from the backend/ directory)
Make sure FIREBASE_SERVICE_ACCOUNT_PATH is set in .env
"""

import os
import sys
from datetime import date, timedelta
from dotenv import load_dotenv

load_dotenv()

import firebase_admin
from firebase_admin import credentials, firestore

# ─── Firebase Init ────────────────────────────────────────────────────────────
DEMO_USER_ID = os.getenv("DEMO_USER_ID", "demo_user_001")
service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./serviceAccountKey.json")

if not os.path.exists(service_account_path):
    print(f"ERROR: Service account key not found at: {service_account_path}")
    print("Please add your serviceAccountKey.json to the backend/ folder and update .env")
    sys.exit(1)

if not firebase_admin._apps:
    cred = credentials.Certificate(service_account_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()
user_ref = db.collection("users").document(DEMO_USER_ID)

# ─── Habit Definitions ────────────────────────────────────────────────────────
HABITS = [
    {
        "id": "habit_read",
        "name": "Read 20 Pages",
        "description": "Read at least 20 pages of a book",
        "color": "#6366f1",
    },
    {
        "id": "habit_meditate",
        "name": "Meditate",
        "description": "10 minutes of mindful meditation",
        "color": "#8b5cf6",
    },
    {
        "id": "habit_exercise",
        "name": "Exercise",
        "description": "At least 30 minutes of physical activity",
        "color": "#ec4899",
    },
    {
        "id": "habit_water",
        "name": "Drink 2L Water",
        "description": "Stay hydrated throughout the day",
        "color": "#06b6d4",
    },
    {
        "id": "habit_nosocial",
        "name": "No Social Media",
        "description": "Avoid mindless scrolling on social platforms",
        "color": "#f59e0b",
    },
]

# ─── Journal Entries ──────────────────────────────────────────────────────────
JOURNAL_ENTRIES = [
    "Today I made the decision to restructure my mornings. I woke up just before sunrise and sat quietly with my coffee. There's something about that silence before the world wakes up that feels sacred. I want to protect it.",
    "Had a tough workout session today but pushed through. My legs feel like jelly, but the endorphin rush afterward is unbeatable. Meditation afterward was particularly deep — I noticed how much my mind sharpens after physical exertion.",
    "Read a fascinating chapter about deep work and the concept of flow states. It's changing how I think about my attention. The argument is that shallow multi-tasking destroys our capacity for meaningful thinking. I believe it.",
    "Skipped meditation today — too rushed in the morning. I noticed the difference in how I handled stress throughout the afternoon. Little frustrations piled up. Reminder to myself: the 10 minutes are never not worth it.",
    "Long journaling session today. I have been thinking about what I actually want my life to look like in five years. Not the achievement milestones — the texture of daily life. The pace. The relationships. Wrote three pages.",
    "Drank my full 2L of water today for the first time this week and felt noticeably better by evening. Headaches I've been attributing to screen time might actually be dehydration. Test continues tomorrow.",
    "Finished the book I've been reading. The ending caught me off guard in the best way. It recontextualized everything that came before. Now I need to find my next one — already have a shortlist of three.",
    "Social media-free day. Filled that time with listening to a long-form podcast while cooking. The quiet of not checking was a bit uncomfortable at first, then just... nice. I forgot how long evenings actually are.",
    "Meditation was difficult today. My mind kept pulling toward a work problem. I kept noting the thought and returning to breath, over and over. Think I returned about forty times. That is probably the whole point.",
    "Rest day from exercise. Went for a slow evening walk instead and let my mind wander. Got three good ideas — one for a project, one for a conversation I've been avoiding, and one completely random idea I will probably forget.",
    "Something clicked today in terms of habit stacking. I do water immediately after exercise, and reading immediately before bed. The habits are forming grooves. Less decision fatigue around them now.",
    "Missed reading today. The day just got away from me. Instead of beating myself up, I am noting it, understanding the context (back-to-back meetings until 9pm), and not treating it as a moral failure. Tomorrow is fresh.",
    "Week-in-review kind of journal entry. Strongest habit this week: meditation — six out of seven days. Weakest: no social media — only three days. The phone is a gravitational pull. Need a structural solution, not just willpower.",
    "Tried something different today: journaled in the morning instead of evening. The quality of thoughts is different — more curious, less analytical. Morning brain traces possibilities. Evening brain processes events. Both are useful.",
    "Good day overall. Exercise in the morning gave the whole day a kind of forward momentum. Meditated for 15 minutes instead of 10 — accidentally — because I didn't want to stop. The habit is taking root.",
    "Thinking about why these habits matter to me. Reading: I want to keep growing intellectually throughout my life. Meditation: I want to be a calmer, more responsive person. Exercise: I want to be healthy at 70. Water: just basic self-respect.",
]

# ─── Completion Patterns ──────────────────────────────────────────────────────
# Per-day completion pattern: list of habit IDs completed that day.
# Index 0 = 16 days ago, index 15 = yesterday.
# Some gaps to make streaks realistic & interesting.
COMPLETION_PATTERNS = [
    # Day -16
    ["habit_read", "habit_meditate", "habit_exercise", "habit_water"],
    # Day -15
    ["habit_read", "habit_meditate", "habit_water", "habit_nosocial"],
    # Day -14
    ["habit_meditate", "habit_exercise", "habit_water"],
    # Day -13
    ["habit_read", "habit_meditate", "habit_exercise", "habit_water", "habit_nosocial"],
    # Day -12
    ["habit_read", "habit_water", "habit_nosocial"],
    # Day -11 (gap day — no meditation, no exercise)
    ["habit_read", "habit_water"],
    # Day -10
    ["habit_read", "habit_meditate", "habit_exercise", "habit_water", "habit_nosocial"],
    # Day -9
    ["habit_meditate", "habit_exercise", "habit_nosocial"],
    # Day -8
    ["habit_read", "habit_meditate", "habit_exercise", "habit_water"],
    # Day -7
    ["habit_read", "habit_meditate", "habit_water", "habit_nosocial"],
    # Day -6
    ["habit_read", "habit_meditate", "habit_exercise", "habit_water", "habit_nosocial"],
    # Day -5 (gap — lazy day)
    ["habit_water"],
    # Day -4
    ["habit_read", "habit_meditate", "habit_exercise", "habit_water"],
    # Day -3
    ["habit_read", "habit_meditate", "habit_exercise", "habit_water", "habit_nosocial"],
    # Day -2
    ["habit_read", "habit_meditate", "habit_exercise", "habit_nosocial"],
    # Day -1 (yesterday)
    ["habit_read", "habit_meditate", "habit_exercise", "habit_water", "habit_nosocial"],
]


def seed_habits():
    print("Seeding habits...")
    habits_ref = user_ref.collection("habits")
    for habit in HABITS:
        habit_id = habit["id"]
        data = {k: v for k, v in habit.items() if k != "id"}
        data["created_at"] = "2026-02-24T06:00:00"
        data["updated_at"] = "2026-02-24T06:00:00"
        habits_ref.document(habit_id).set(data)
        print(f"  ✓ Habit: {habit['name']} ({habit_id})")
    print(f"  {len(HABITS)} habits seeded.\n")


def seed_journals():
    print("Seeding journal entries...")
    journals_ref = user_ref.collection("journals")
    today = date.today()
    start = today - timedelta(days=16)

    for i, content in enumerate(JOURNAL_ENTRIES):
        entry_date = start + timedelta(days=i)
        date_str = entry_date.isoformat()
        doc_ref = journals_ref.document(f"journal_{date_str}")
        doc_ref.set({
            "content": content,
            "date": date_str,
            "created_at": f"{date_str}T21:00:00",
            "updated_at": f"{date_str}T21:00:00",
        })
        print(f"  ✓ Journal entry: {date_str}")
    print(f"  {len(JOURNAL_ENTRIES)} journal entries seeded.\n")


def seed_completions():
    print("Seeding habit completions...")
    completions_ref = user_ref.collection("completions")
    today = date.today()
    start = today - timedelta(days=16)

    for i, completed_habits in enumerate(COMPLETION_PATTERNS):
        completion_date = start + timedelta(days=i)
        date_str = completion_date.isoformat()
        data = {}
        for habit in HABITS:
            data[habit["id"]] = habit["id"] in completed_habits
        completions_ref.document(date_str).set(data)
        done = [h for h in completed_habits]
        print(f"  ✓ {date_str}: {len(completed_habits)}/5 habits completed")
    print(f"  {len(COMPLETION_PATTERNS)} days of completions seeded.\n")


def main():
    print("=" * 50)
    print("DailyRoutine — Demo Data Seeder")
    print(f"Target user: {DEMO_USER_ID}")
    print("=" * 50 + "\n")

    # Set demo user metadata
    user_ref.set({
        "user_id": DEMO_USER_ID,
        "name": "Demo User",
        "email": "demo@dailyroutine.app",
        "created_at": "2026-02-24T06:00:00",
    }, merge=True)

    seed_habits()
    seed_journals()
    seed_completions()

    print("=" * 50)
    print("✅ All demo data seeded successfully!")
    print("=" * 50)


if __name__ == "__main__":
    main()
