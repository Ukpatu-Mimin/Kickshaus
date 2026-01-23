from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_order_home():
    return {"message": "Order System"}