from firebase_admin import credentials, initialize_app, storage
import os
from dotenv import load_dotenv

load_dotenv()

# We need a standalone initialization for this script to avoid messing with app.main
cred = credentials.Certificate(os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "./serviceAccountKey.json"))

# We explicitly need the bucket URL from the frontend .env since backend uses Firestore only
# We explicitly need the bucket URL. The underlying GCP bucket for Firebase is usually .appspot.com
bucket_name = "daily-routine-13a97.appspot.com"

try:
    initialize_app(cred, {"storageBucket": bucket_name})
except ValueError:
    pass  # Already initialized

try:
    bucket = storage.bucket(bucket_name)

    cors = [{
        "origin": ["*"],
        "method": ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
        "maxAgeSeconds": 3600,
        "responseHeader": ["Content-Type", "x-goog-resumable", "Authorization"]
    }]

    bucket.cors = cors
    bucket.patch()

    print(f"\nSUCCESS! CORS rules successfully applied to {bucket_name}")
except Exception as e:
    print(f"\nERROR: Failed to update bucket. Are you sure the bucket name '{bucket_name}' is exactly correct in your Firebase Storage console?")
    print(f"Details: {str(e)}")
