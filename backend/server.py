import logging
import os

from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

from db import client
from routers import catalog, gpx, photos, stats, summits
from services.storage import init_storage

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

# ---- App --------------------------------------------------------------------
app = FastAPI()
api_router = APIRouter(prefix="/api")


@app.on_event("startup")
async def startup():
    try:
        init_storage()
        logger.info("Object storage initialized")
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@api_router.get("/")
async def root():
    return {"message": "VeloSummit API"}


api_router.include_router(summits.router)
api_router.include_router(catalog.router)
api_router.include_router(gpx.router)
api_router.include_router(stats.router)
api_router.include_router(photos.router)

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
