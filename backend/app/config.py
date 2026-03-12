import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

_app = None
_db = None


def get_db():
    global _app, _db
    if _db is None:
        service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./serviceAccountKey.json")
        if not firebase_admin._apps:
            cred = credentials.Certificate(service_account_path)
            _app = firebase_admin.initialize_app(cred)
        _db = firestore.client()
    return _db


DEMO_USER_ID = os.getenv("DEMO_USER_ID", "demo_user_001")
