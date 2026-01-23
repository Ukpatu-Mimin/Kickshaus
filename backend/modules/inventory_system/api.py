from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def get_inventory_home():
    return {"message": "Inventory System"}