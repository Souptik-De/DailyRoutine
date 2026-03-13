from fastapi import APIRouter, HTTPException
from datetime import datetime
import asyncio
import logging
from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from app.config import get_db, DEMO_USER_ID
from app.models import JournalEntry, JournalEntryUpdate
import app.services.cache as cache
from app.services.gemini import analyse_entry, AnalysisError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/journals", tags=["journals"])


def journals_collection():
    return get_db().collection("users").document(DEMO_USER_ID).collection("journals")


def analysis_collection():
    return get_db().collection("users").document(DEMO_USER_ID).collection("journal_analysis")


async def _run_analysis(entry_id: str, date: str, content: str):
    """Fire-and-forget: analyse journal content and store the result."""
    try:
        result = await asyncio.to_thread(analyse_entry, content)
        analysis_collection().document(date).set({
            "entry_id": entry_id,
            "date": date,
            "sentiment": result["sentiment"],
            "mood_score": result["mood_score"],
            "themes": result["themes"],
            "analysed_at": datetime.utcnow().isoformat(),
        })
        logger.info("Analysis saved for %s", date)
    except AnalysisError as e:
        logger.warning("Analysis skipped for %s: %s", date, e)
    except Exception as e:
        logger.error("Unexpected analysis error for %s: %s", date, e)


@router.get("")
async def list_journals():
    """List all journal entries, sorted by date descending."""
    cached = cache.get_cache("journals")
    if cached is not None:
        return cached

    docs = journals_collection().order_by("date", direction="DESCENDING").stream()
    entries = []
    for doc in docs:
        entry = doc.to_dict()
        entry["id"] = doc.id
        entries.append(entry)
    
    cache.set_cache("journals", entries)
    return entries


@router.get("/{date_str}")
async def get_journal_by_date(date_str: str):
    """Get a journal entry for a specific date (YYYY-MM-DD)."""
    # If cached, use it
    cached = cache.get_cache("journals")
    if cached is not None:
        for entry in cached:
            if entry.get("date") == date_str:
                return entry
        raise HTTPException(status_code=404, detail="No journal entry found for this date")

    docs = journals_collection().where("date", "==", date_str).stream()
    for doc in docs:
        entry = doc.to_dict()
        entry["id"] = doc.id
        return entry
    raise HTTPException(status_code=404, detail="No journal entry found for this date")


@router.post("", status_code=201)
async def create_journal(entry: JournalEntry):
    """Create a new journal entry. One entry per date."""
    # Check if entry for this date already exists
    cached = cache.get_cache("journals")
    if cached is not None:
        if any(e.get("date") == entry.date for e in cached):
            raise HTTPException(status_code=409, detail="Journal entry for this date already exists. Use PUT to update.")
    else:
        existing = journals_collection().where("date", "==", entry.date).stream()
        for _ in existing:
            raise HTTPException(status_code=409, detail="Journal entry for this date already exists. Use PUT to update.")

    doc_ref = journals_collection().document()
    now = datetime.utcnow().isoformat()
    data = {
        "content": entry.content,
        "date": entry.date,
        "created_at": now,
        "updated_at": now,
    }
    doc_ref.set(data)
    
    # Update cache
    if cached is not None:
        cached.append({"id": doc_ref.id, **data})
        cached.sort(key=lambda x: x.get("date", ""), reverse=True)
        cache.set_cache("journals", cached)

    # Fire-and-forget mood analysis
    asyncio.create_task(_run_analysis(doc_ref.id, entry.date, entry.content))

    return {"id": doc_ref.id, **data}


@router.put("/{entry_id}")
async def update_journal(entry_id: str, update: JournalEntryUpdate):
    """Update an existing journal entry's content."""
    doc_ref = journals_collection().document(entry_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Journal entry not found")

    now = datetime.utcnow().isoformat()
    doc_ref.update({"content": update.content, "updated_at": now})

    updated = doc_ref.get().to_dict()
    updated["id"] = entry_id

    # Update cache
    cached = cache.get_cache("journals")
    if cached is not None:
        for entry in cached:
            if entry.get("id") == entry_id:
                entry["content"] = update.content
                entry["updated_at"] = now
                break
        cache.set_cache("journals", cached)

    # Fire-and-forget mood analysis
    entry_date = updated.get("date", "")
    if entry_date:
        asyncio.create_task(_run_analysis(entry_id, entry_date, update.content))

    return updated


@router.delete("/{entry_id}", status_code=204)
async def delete_journal(entry_id: str):
    """Delete a journal entry."""
    doc_ref = journals_collection().document(entry_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    doc_ref.delete()

    # Update cache
    cached = cache.get_cache("journals")
    if cached is not None:
        cached = [e for e in cached if e.get("id") != entry_id]
        cache.set_cache("journals", cached)

    return None
