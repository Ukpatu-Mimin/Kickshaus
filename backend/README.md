# Kickshaus Backend

This is the backend for the Kickshaus e-commerce platform, built with Django and FastAPI.

## Setup

1.  **Create a virtual environment:**
    ```bash
    python -m venv venv
    source venv/bin/activate
    ```

2.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

3.  **Set up the PostgreSQL database:**
    - Create a PostgreSQL database named `kickshaus`.
    - Create a user with credentials and update them in `backend/core/settings.py`.

4.  **Run Django migrations:**
    ```bash
    python manage.py migrate
    ```

## Running the application

Use Uvicorn to run the ASGI application:

```bash
uvicorn core.asgi:application --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000/api`.
The Django admin will be available at `http://localhost:8000/admin`.
