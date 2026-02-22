import asyncio

from fastapi import APIRouter, FastAPI
from fastapi.concurrency import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from services.rabbit_service import RabbitService
from src.core.config import settings
from src.routes.migration_routes import router as migration_router

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


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app_router = APIRouter(prefix="/api")
app_router.include_router(migration_router)

app.include_router(app_router)
