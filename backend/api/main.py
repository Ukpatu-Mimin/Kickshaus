from fastapi import FastAPI

app = FastAPI(title="Kickshaus API")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Kickshaus API"}

# Import and include module routers here
from modules.auth_system.api import router as auth_router
from modules.inventory_system.api import router as inventory_router
from modules.order_system.api import router as order_router
from modules.feedback_system.api import router as feedback_router

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(inventory_router, prefix="/products", tags=["Inventory"])
app.include_router(order_router, prefix="/orders", tags=["Orders"])
app.include_router(feedback_router, prefix="/feedback", tags=["Feedback"])