# DailyRoutine — Habit Tracker & Journal (Track 2)

A production-ready habit tracker and journaling app built for the AI Protosprint hackathon.

**Stack:** FastAPI · Firebase Firestore · React + Vite · TypeScript · shadcn/ui · Tailwind CSS

---

## Project Structure

```
E-commerce/
├── backend/          # FastAPI app
│   ├── app/
│   │   ├── main.py           # App entry point + CORS
│   │   ├── config.py         # Firebase Admin SDK init
│   │   ├── models.py         # Pydantic request models
│   │   ├── routers/
│   │   │   ├── journals.py   # CRUD for journal entries
│   │   │   ├── habits.py     # CRUD for habits + streak endpoint
│   │   │   └── completions.py # Mark/unmark habits per day
│   │   └── services/
│   │       └── streak.py     # Streak calculation logic
│   ├── seed_data.py          # Demo data seeder
│   ├── requirements.txt
│   └── .env                  # Set FIREBASE_SERVICE_ACCOUNT_PATH here
└── frontend/         # React app
    └── src/
        ├── lib/
        │   ├── api.ts        # Axios API layer
        │   └── utils.ts      # cn() utility
        ├── components/
        │   ├── Layout.tsx    # Sidebar navigation
        │   └── ui/           # shadcn-style components
        └── pages/
            ├── Dashboard.tsx # Today's habit checklist
            ├── Habits.tsx    # Manage habits + streaks
            ├── Journal.tsx   # Daily journal entry
            └── History.tsx   # Calendar history view
```

---

## Setup

### 1. Firebase

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Firestore Database** (start in test mode)
3. Go to **Project Settings → Service Accounts → Generate new private key**
4. Save the JSON as `backend/serviceAccountKey.json`

### 2. Backend

```bash
cd backend
.venv\Scripts\activate        # Windows (venv already created)
# or: python -m venv .venv && .venv\Scripts\activate

pip install -r requirements.txt

# Seed demo data (16 days of habits, journal entries, completions)
python seed_data.py

# Start the API
uvicorn app.main:app --reload --port 8000
```

API docs available at **http://localhost:8000/docs**

### 3. Frontend

```bash
cd frontend
npm install          # already done
npm run dev
```

Open **http://localhost:5173**

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/habits` | List all habits |
| POST | `/api/habits` | Create a habit |
| PUT | `/api/habits/{id}` | Update a habit |
| DELETE | `/api/habits/{id}` | Delete a habit |
| GET | `/api/habits/{id}/streak` | Current & longest streak |
| GET | `/api/journals` | List all journal entries |
| POST | `/api/journals` | Create an entry |
| GET | `/api/journals/{date}` | Get entry for date (YYYY-MM-DD) |
| PUT | `/api/journals/{id}` | Update an entry |
| DELETE | `/api/journals/{id}` | Delete an entry |
| GET | `/api/completions/{date}` | Completions for a date |
| POST | `/api/completions/{date}/{habit_id}` | Mark complete |
| DELETE | `/api/completions/{date}/{habit_id}` | Unmark complete |
| GET | `/api/completions/range?start_date=&end_date=` | Range query |

---

## Demo Data

After running `seed_data.py`, the app is pre-populated with:
- **5 habits**: Read 20 Pages, Meditate, Exercise, Drink 2L Water, No Social Media
- **16 journal entries** (one per day, thoughtfully written)
- **16 days of completions** with realistic patterns (some gaps for interesting streak data) 

Demo user: `demo_user_001`
