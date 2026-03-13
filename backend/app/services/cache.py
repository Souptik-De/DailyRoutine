from typing import Any, Dict

# Global cache to reduce Firebase reads
# Format: { "collection_name": { "data": Any, "is_valid": bool } }
_cache: Dict[str, Dict[str, Any]] = {
    "journals": {"data": None, "is_valid": False},
    "habits": {"data": None, "is_valid": False},
    "completions": {"data": None, "is_valid": False},
}

def get_cache(collection: str) -> Any:
    """Return the cached data if valid, else None."""
    if _cache.get(collection, {}).get("is_valid"):
        return _cache[collection]["data"]
    return None

def set_cache(collection: str, data: Any):
    """Set the cache data for a collection."""
    if collection in _cache:
        _cache[collection]["data"] = data
        _cache[collection]["is_valid"] = True

def invalidate_cache(collection: str):
    """Invalidate the cache for a collection."""
    if collection in _cache:
        _cache[collection]["is_valid"] = False

def update_cache_in_place(collection: str, data: Any):
    """Updates the reference and marks it valid."""
    set_cache(collection, data)
