from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import journals, habits, completions, insights

app = FastAPI(
    title="DailyRoutine API",
    description="Habit Tracker & Journal Backend for DailyRoutine",
    version="1.0.0",
)

# CORS — allow the React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:3000",
        "https://nooblers-daily-routine.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(journals.router)
app.include_router(habits.router)
app.include_router(completions.router)
app.include_router(insights.router)


@app.get("/")
async def root():
    return {
        "message": "DailyRoutine API is running",
        "docs": "/docs",
        "version": "1.0.0",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
