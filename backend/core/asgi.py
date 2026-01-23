import os
import django
from django.core.asgi import get_asgi_application
from fastapi import FastAPI
from starlette.routing import Mount
from starlette.applications import Starlette

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.main import app as fastapi_app

# The Django ASGI application
django_asgi_app = get_asgi_application()

# The main application that will route traffic
application = Starlette(
    routes=[
        Mount("/api", app=fastapi_app),
        Mount("/", app=django_asgi_app),
    ]
)

