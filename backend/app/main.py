from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import settings as settings_router
from app.routers import subscription as subscription_router
from app.routers import webhooks as webhooks_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="startup-page-api", version="1.0.0", lifespan=lifespan)

# CORS — update origins as your Vercel deployments are created
_origins = [
    "http://localhost:5173",
    "http://localhost:4173",
]
if settings.APP_URL:
    _origins.append(settings.APP_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(settings_router.router, prefix="/api")
app.include_router(subscription_router.router, prefix="/api")
app.include_router(webhooks_router.router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
