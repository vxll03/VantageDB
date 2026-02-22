from fastapi import APIRouter, Query, UploadFile

from src.dependencies import FileServiceDep, RabbitServiceDep
from src.schemas.api_schemas import (
    MigrationUploadResponseSchema,
)
from src.utils.enums import RabbitTaskStatus

router = APIRouter()


@router.post(
    "/upload_new",
    response_model=MigrationUploadResponseSchema,
    status_code=201,
)
async def upload_migrations(
    file: UploadFile,
    rabbit_srv: RabbitServiceDep,
    migration_srv: FileServiceDep,
    project_name: str = Query(...),
):
    revision = await migration_srv.prepare_file(project_name=project_name, file=file)
    await rabbit_srv.publish_task(project_name=project_name, revision=revision)

    return {
        "status": RabbitTaskStatus.ACCEPTED,
        "project": project_name,
        "file": file.filename,
        "revision": revision,
    }
