from fastapi import APIRouter, HTTPException
from datetime import datetime
from google.cloud.firestore_v1 import SERVER_TIMESTAMP
from app.config import get_db, DEMO_USER_ID
from app.models import JournalEntry, JournalEntryUpdate

router = APIRouter(prefix="/api/journals", tags=["journals"])


def journals_collection():
    return get_db().collection("users").document(DEMO_USER_ID).collection("journals")


@router.get("")
async def list_journals():
    """List all journal entries, sorted by date descending."""
    docs = journals_collection().order_by("date", direction="DESCENDING").stream()
    entries = []
    for doc in docs:
        entry = doc.to_dict()
        entry["id"] = doc.id
        entries.append(entry)
    return entries


@router.get("/{date_str}")
async def get_journal_by_date(date_str: str):
    """Get a journal entry for a specific date (YYYY-MM-DD)."""
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
    return updated


@router.delete("/{entry_id}", status_code=204)
async def delete_journal(entry_id: str):
    """Delete a journal entry."""
    doc_ref = journals_collection().document(entry_id)
    doc = doc_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    doc_ref.delete()
    return None
