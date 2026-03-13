from app.services.accountability import _completions_col
from datetime import date

def diagnose():
    comp_dict = {}
    for doc in _completions_col().stream():
        data = doc.to_dict() or {}
        completed_ids = [hid for hid, checked in data.items() if checked is True]
        print(f"Doc ID: {doc.id}, Type: {type(doc.id)}")
        comp_dict[doc.id] = completed_ids

    keys = list(comp_dict.keys())
    print(f"Keys: {keys}")
    
    for k in keys:
        if k is None:
            print("Found None key!")
        else:
            try:
                d = date.fromisoformat(k)
                print(f"Parsed {k} as {d}")
            except ValueError:
                print(f"Failed to parse {k}")

if __name__ == "__main__":
    diagnose()
