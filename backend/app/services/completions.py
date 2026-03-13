from app.config import get_db, DEMO_USER_ID
import app.services.cache as cache

def completions_collection():
    return get_db().collection("users").document(DEMO_USER_ID).collection("completions")

def get_all_completions_dict():
    cached = cache.get_cache("completions")
    if cached is not None:
        return cached

    docs = completions_collection().stream()
    result = {}
    for doc in docs:
        data = doc.to_dict() or {}
        completed = [habit_id for habit_id, checked in data.items() if checked is True]
        result[doc.id] = completed
        
    cache.set_cache("completions", result)
    return result
