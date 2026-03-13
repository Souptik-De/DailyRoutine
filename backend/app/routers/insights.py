from fastapi import APIRouter, Query
from datetime import datetime, timedelta
from collections import Counter
from app.config import get_db, DEMO_USER_ID

router = APIRouter(prefix="/api/insights", tags=["insights"])


def analysis_collection():
    return get_db().collection("users").document(DEMO_USER_ID).collection("journal_analysis")


@router.get("")
async def get_insights(days: int = Query(14, ge=1, le=365)):
    """
    Returns mood insights for the last N days.

    Response includes:
    - entries: array of { date, sentiment, mood_score, themes }
    - top_themes: top 5 recurring themes with counts
    - sentiment_counts: count per sentiment label
    """
    cutoff = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")

    docs = (
        analysis_collection()
        .where("date", ">=", cutoff)
        .order_by("date", direction="DESCENDING")
        .stream()
    )

    entries = []
    theme_counter = Counter()
    sentiment_counter = Counter()

    for doc in docs:
        data = doc.to_dict()
        entry = {
            "date": data.get("date", doc.id),
            "sentiment": data.get("sentiment", "Neutral"),
            "mood_score": data.get("mood_score", 0.0),
            "themes": data.get("themes", []),
        }
        entries.append(entry)
        sentiment_counter[entry["sentiment"]] += 1
        for theme in entry["themes"]:
            theme_counter[theme] += 1

    top_themes = [
        {"theme": theme, "count": count}
        for theme, count in theme_counter.most_common(5)
    ]

    return {
        "entries": entries,
        "top_themes": top_themes,
        "sentiment_counts": dict(sentiment_counter),
    }
