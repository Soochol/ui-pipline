"""Pipeline API routes - refactored with Use Cases."""

from fastapi import APIRouter, HTTPException, Depends
from dependency_injector.wiring import inject, Provide

from api.models import (
    PipelineExecuteRequest,
    PipelineExecuteResponse,
    PipelineSaveRequest,
    PipelineSaveResponse,
    PipelineListResponse,
    PipelineGetResponse,
    PipelineDeleteResponse,
    PipelineMetadata,
)
from domain.use_cases.pipeline_use_cases import (
    ExecutePipelineUseCase,
    SavePipelineUseCase,
    GetPipelineUseCase,
    ListPipelinesUseCase,
    DeletePipelineUseCase,
)
from infrastructure.di_container import Container

router = APIRouter(prefix="/pipelines", tags=["pipelines"])


@router.post("/execute", response_model=PipelineExecuteResponse)
@inject
async def execute_pipeline(
    request: PipelineExecuteRequest,
    use_case: ExecutePipelineUseCase = Depends(
        Provide[Container.execute_pipeline_use_case]
    ),
):
    """Execute a pipeline."""
    try:
        # Convert Pydantic models to dict
        pipeline_def = {
            "pipeline_id": request.pipeline.pipeline_id,
            "name": request.pipeline.name,
            "nodes": [node.model_dump() for node in request.pipeline.nodes],
            "edges": [edge.model_dump() for edge in request.pipeline.edges],
            "variables": request.pipeline.variables,
        }

        result = await use_case.execute(pipeline_def)
        return PipelineExecuteResponse(**result)
    except Exception as e:
        # Use case already handles errors gracefully
        result = {
            "success": False,
            "pipeline_id": request.pipeline.pipeline_id,
            "execution_time": 0.0,
            "nodes_executed": 0,
            "results": {},
            "error": str(e),
        }
        return PipelineExecuteResponse(**result)


@router.post("/save", response_model=PipelineSaveResponse)
@inject
async def save_pipeline(
    request: PipelineSaveRequest,
    use_case: SavePipelineUseCase = Depends(Provide[Container.save_pipeline_use_case]),
):
    """Save a pipeline."""
    try:
        pipeline_def = request.pipeline  # Already a dict now
        result = await use_case.execute(pipeline_def)
        return PipelineSaveResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to save pipeline: {str(e)}"
        )


@router.get("", response_model=PipelineListResponse)
@inject
async def list_pipelines(
    use_case: ListPipelinesUseCase = Depends(
        Provide[Container.list_pipelines_use_case]
    ),
):
    """List all saved pipelines."""
    try:
        pipelines_meta = await use_case.execute()

        pipelines = [
            PipelineMetadata(
                id=p["id"],
                name=p["name"],
                created_at=p["created_at"],
                updated_at=p["updated_at"],
            )
            for p in pipelines_meta
        ]

        return PipelineListResponse(pipelines=pipelines, count=len(pipelines))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to list pipelines: {str(e)}"
        )


@router.get("/{pipeline_id}", response_model=PipelineGetResponse)
@inject
async def get_pipeline(
    pipeline_id: str,
    use_case: GetPipelineUseCase = Depends(Provide[Container.get_pipeline_use_case]),
):
    """Get a specific pipeline by ID."""
    try:
        pipeline_data = await use_case.execute(pipeline_id)
        return PipelineGetResponse(pipeline=pipeline_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get pipeline: {str(e)}"
        )


@router.delete("/{pipeline_id}", response_model=PipelineDeleteResponse)
@inject
async def delete_pipeline(
    pipeline_id: str,
    use_case: DeletePipelineUseCase = Depends(
        Provide[Container.delete_pipeline_use_case]
    ),
):
    """Delete a pipeline."""
    try:
        result = await use_case.execute(pipeline_id)
        return PipelineDeleteResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete pipeline: {str(e)}"
        )
