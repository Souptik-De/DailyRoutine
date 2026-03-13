"""
Batch backfill script: analyses all existing journal entries
that don't yet have a mood analysis record.

Usage:  python backfill_moods.py
"""
import time
import sys
import os

# Add the backend directory to the path so we can import app modules
sys.path.insert(0, os.path.dirname(__file__))

from app.config import get_db, DEMO_USER_ID
from app.services.gemini import analyse_entry, AnalysisError
from datetime import datetime


def main():
    db = get_db()
    user_ref = db.collection("users").document(DEMO_USER_ID)
    journals_ref = user_ref.collection("journals")
    analysis_ref = user_ref.collection("journal_analysis")

    # Get all journal entries
    print("=" * 50)
    print("DailyRoutine — Mood Backfill")
    print(f"Target user: {DEMO_USER_ID}")
    print("=" * 50)

    journals = list(journals_ref.order_by("date").stream())
    print(f"\nFound {len(journals)} journal entries.")

    # Get existing analysis dates
    existing = set()
    for doc in analysis_ref.stream():
        existing.add(doc.id)

    to_process = []
    for doc in journals:
        data = doc.to_dict()
        date = data.get("date", "")
        if date and date not in existing:
            to_process.append((doc.id, date, data.get("content", "")))

    if not to_process:
        print("\n✅ All entries already analysed. Nothing to do.")
        return

    print(f"  {len(existing)} already analysed, {len(to_process)} to process.\n")

    BATCH_SIZE = 20
    success = 0
    skipped = 0
    failed = 0

    for i in range(0, len(to_process), BATCH_SIZE):
        batch = to_process[i : i + BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (len(to_process) + BATCH_SIZE - 1) // BATCH_SIZE
        print(f"Batch {batch_num}/{total_batches} ({len(batch)} entries)...")

        for entry_id, date, content in batch:
            try:
                result = analyse_entry(content)
                analysis_ref.document(date).set({
                    "entry_id": entry_id,
                    "date": date,
                    "sentiment": result["sentiment"],
                    "mood_score": result["mood_score"],
                    "themes": result["themes"],
                    "analysed_at": datetime.utcnow().isoformat(),
                })
                print(f"  ✓ {date}: {result['sentiment']} ({result['mood_score']:+.2f}) — {result['themes']}")
                success += 1
            except AnalysisError as e:
                print(f"  ✗ {date}: Skipped — {e}")
                skipped += 1
            except Exception as e:
                print(f"  ✗ {date}: Error — {e}")
                failed += 1

        # Delay between batches to respect rate limits
        if i + BATCH_SIZE < len(to_process):
            print("  (waiting 1s before next batch...)")
            time.sleep(1)

    print(f"\n{'=' * 50}")
    print(f"✅ Backfill complete!")
    print(f"   Analysed: {success}")
    print(f"   Skipped:  {skipped}")
    print(f"   Failed:   {failed}")
    print(f"{'=' * 50}")


if __name__ == "__main__":
    main()
