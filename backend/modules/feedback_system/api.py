from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_feedback_home():
    return {"message": "Feedback System"}