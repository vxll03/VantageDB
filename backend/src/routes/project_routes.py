from fastapi import APIRouter

from src.dependencies import ProjectServiceDep
from src.schemas.api_schemas import (
    ProjectCreateSchema,
    ProjectResponseSchema,
    ProjectStatsResponseSchema,
)

router = APIRouter()


@router.get("", response_model=list[ProjectStatsResponseSchema])
async def get_project_list_w_stats(srv: ProjectServiceDep):
    return await srv.get_projects_with_stats()


@router.post("", status_code=201, response_model=ProjectResponseSchema)
async def create_project(srv: ProjectServiceDep, schema: ProjectCreateSchema):
    return await srv.create_project(name=schema.name, icon=schema.icon)
