from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import logging
from app.routers import journals, habits, completions, insights, notifications
from app.services.accountability import run_accountability_check

logger = logging.getLogger(__name__)

_audit_task = None


async def _hourly_audit_loop():
    """Background loop: run accountability audit every hour."""
    while True:
        try:
            await asyncio.sleep(3600)  # 1 hour
            logger.info("[Scheduler] Running hourly accountability audit...")
            await asyncio.to_thread(run_accountability_check)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error("[Scheduler] Audit failed: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _audit_task
    _audit_task = asyncio.create_task(_hourly_audit_loop())
    logger.info("[Scheduler] Accountability audit scheduled (every 1h).")
    yield
    _audit_task.cancel()
    logger.info("[Scheduler] Accountability audit stopped.")


app = FastAPI(
    title="DailyRoutine API",
    description="Habit Tracker & Journal Backend for DailyRoutine",
    version="1.0.0",
    lifespan=lifespan,
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
app.include_router(notifications.router)


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
