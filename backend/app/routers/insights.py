from fastapi import APIRouter, Query
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from app.config import get_db, DEMO_USER_ID

router = APIRouter(prefix="/api/insights", tags=["insights"])


def analysis_collection():
    return get_db().collection("users").document(DEMO_USER_ID).collection("journal_analysis")


def journals_collection():
    return get_db().collection("users").document(DEMO_USER_ID).collection("journals")


@router.get("")
async def get_insights(days: int = Query(14, ge=1, le=365)):
    """
    Returns mood insights for the last N days.

    Response includes:
    - entries: array of { date, sentiment, mood_score, themes, content }
    - top_themes: top 5 recurring themes with counts
    - theme_dates: mapping of theme -> list of dates
    - sentiment_counts: count per sentiment label
    """
    cutoff = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%d")

    # Fetch journal entries to build a date -> content map
    journal_docs = (
        journals_collection()
        .where("date", ">=", cutoff)
        .stream()
    )
    content_map = {}
    for jdoc in journal_docs:
        jdata = jdoc.to_dict()
        content_map[jdata.get("date", "")] = jdata.get("content", "")

    docs = (
        analysis_collection()
        .where("date", ">=", cutoff)
        .order_by("date", direction="DESCENDING")
        .stream()
    )

    entries = []
    theme_counter = Counter()
    theme_dates = defaultdict(list)
    sentiment_counter = Counter()

    for doc in docs:
        data = doc.to_dict()
        entry_date = data.get("date", doc.id)
        themes = data.get("themes", [])
        entry = {
            "date": entry_date,
            "sentiment": data.get("sentiment", "Neutral"),
            "mood_score": data.get("mood_score", 0.0),
            "themes": themes,
            "content": content_map.get(entry_date, ""),
        }
        entries.append(entry)
        sentiment_counter[entry["sentiment"]] += 1
        for theme in themes:
            theme_counter[theme] += 1
            theme_dates[theme].append(entry_date)

    top_themes = [
        {"theme": theme, "count": count}
        for theme, count in theme_counter.most_common(5)
    ]

    return {
        "entries": entries,
        "top_themes": top_themes,
        "theme_dates": dict(theme_dates),
        "sentiment_counts": dict(sentiment_counter),
    }
