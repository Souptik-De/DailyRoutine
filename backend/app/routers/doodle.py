from fastapi import APIRouter
from app.services.doodle import generate_doodle

router = APIRouter(prefix="/api/doodle", tags=["doodle"])

@router.get("")
async def get_doodle():
    """Get a new set of doodle commands."""
    return generate_doodle()
