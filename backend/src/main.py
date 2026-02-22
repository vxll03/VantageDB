import asyncio

from fastapi import APIRouter, FastAPI
from fastapi.concurrency import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from src.core.config import settings
from src.routes.migration_routes import router as migration_router
from src.routes.project_routes import router as project_router
from src.routes.snapshot_routes import router as snapshot_router
from src.services.rabbit_service import RabbitService

rabbit_service = RabbitService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    consumer_task = asyncio.create_task(rabbit_service.consume_results())
    logger.info("Consumer task started.")
    yield

    consumer_task.cancel()
    try:
        await consumer_task
    except asyncio.CancelledError:
        logger.info("Consumer task cancelled successfully.")


app = FastAPI(
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app_router = APIRouter(prefix="/api")
app_router.include_router(migration_router, prefix="/migrations", tags=['Migration'])
app_router.include_router(project_router, prefix="/projects", tags=['Project'])
app_router.include_router(snapshot_router, prefix="/snapshots", tags=['Snapshot'])

app.include_router(app_router)
