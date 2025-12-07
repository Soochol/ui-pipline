"""API routes for UI Pipeline System."""

from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import time

from .models import (
    HealthResponse,
    PluginListResponse,
    DeviceCreateRequest,
    DeviceResponse,
    DeviceListResponse,
    DeviceDeleteResponse,
    PipelineExecuteRequest,
    PipelineExecuteResponse,
    FunctionExecuteRequest,
    FunctionExecuteResponse,
    PipelineSaveRequest,
    PipelineSaveResponse,
    PipelineListResponse,
    PipelineGetResponse,
    PipelineDeleteResponse,
    PipelineMetadata,
)

router = APIRouter()

# Global state (will be replaced with proper managers later)
_plugin_loader = None
_device_manager = None
_execution_engine = None
_pipeline_repository = None


def set_managers(plugin_loader, device_manager, execution_engine, pipeline_repository=None):
    """Set manager instances."""
    global _plugin_loader, _device_manager, _execution_engine, _pipeline_repository
    _plugin_loader = plugin_loader
    _device_manager = device_manager
    _execution_engine = execution_engine
    _pipeline_repository = pipeline_repository


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="ok",
        message="UI Pipeline System is running"
    )


@router.get("/plugins", response_model=PluginListResponse)
async def list_plugins():
    """Get list of available plugins."""
    if _plugin_loader is None:
        return PluginListResponse(plugins=[], count=0)

    try:
        plugins = await _plugin_loader.discover_plugins()
        return PluginListResponse(
            plugins=plugins,
            count=len(plugins)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list plugins: {str(e)}")


@router.get("/devices", response_model=DeviceListResponse)
async def list_devices():
    """Get list of device instances."""
    if _device_manager is None:
        return DeviceListResponse(devices=[], count=0)

    try:
        devices = _device_manager.list_device_instances()
        return DeviceListResponse(
            devices=devices,
            count=len(devices)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list devices: {str(e)}")


@router.post("/devices", response_model=DeviceResponse)
async def create_device(request: DeviceCreateRequest):
    """Create a new device instance."""
    if _device_manager is None:
        raise HTTPException(status_code=500, detail="Device manager not initialized")

    try:
        instance_id = await _device_manager.create_device_instance(
            plugin_id=request.plugin_id,
            instance_id=request.instance_id,
            config=request.config
        )

        device = _device_manager.get_device_instance(instance_id)
        device_info = device.get_info()

        return DeviceResponse(
            instance_id=device_info["id"],
            plugin_id=request.plugin_id,
            status=device_info["status"],
            config=device_info["config"],
            error=device.get_error()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create device: {str(e)}")


@router.delete("/devices/{instance_id}", response_model=DeviceDeleteResponse)
async def delete_device(instance_id: str):
    """Delete a device instance."""
    if _device_manager is None:
        raise HTTPException(status_code=500, detail="Device manager not initialized")

    try:
        success = await _device_manager.remove_device_instance(instance_id)

        if not success:
            raise HTTPException(status_code=404, detail=f"Device '{instance_id}' not found")

        return DeviceDeleteResponse(
            success=True,
            instance_id=instance_id,
            message=f"Device '{instance_id}' deleted successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete device: {str(e)}")


@router.post("/devices/function", response_model=FunctionExecuteResponse)
async def execute_function(request: FunctionExecuteRequest):
    """Execute a device function."""
    if _device_manager is None:
        raise HTTPException(status_code=500, detail="Device manager not initialized")

    try:
        start_time = time.time()

        outputs = await _device_manager.execute_function(
            instance_id=request.instance_id,
            function_id=request.function_id,
            inputs=request.inputs
        )

        execution_time = time.time() - start_time

        return FunctionExecuteResponse(
            success=True,
            instance_id=request.instance_id,
            function_id=request.function_id,
            outputs=outputs,
            execution_time=execution_time
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        return FunctionExecuteResponse(
            success=False,
            instance_id=request.instance_id,
            function_id=request.function_id,
            error=str(e),
            execution_time=time.time() - start_time
        )


@router.post("/pipelines/execute", response_model=PipelineExecuteResponse)
async def execute_pipeline(request: PipelineExecuteRequest):
    """Execute a pipeline."""
    if _execution_engine is None:
        raise HTTPException(status_code=500, detail="Execution engine not initialized")

    try:
        start_time = time.time()

        # Convert Pydantic models to dict
        pipeline_def = {
            "pipeline_id": request.pipeline.pipeline_id,
            "name": request.pipeline.name,
            "nodes": [node.model_dump() for node in request.pipeline.nodes],
            "edges": [edge.model_dump() for edge in request.pipeline.edges],
            "variables": request.pipeline.variables
        }

        result = await _execution_engine.execute_pipeline(pipeline_def)

        execution_time = time.time() - start_time

        # Convert results to proper format
        node_results = {}
        for node_id, outputs in result.get("results", {}).items():
            node_results[node_id] = {
                "node_id": node_id,
                "status": "completed",
                "outputs": outputs,
                "error": None,
                "execution_time": 0.0
            }

        return PipelineExecuteResponse(
            success=result.get("success", True),
            pipeline_id=request.pipeline.pipeline_id,
            execution_time=execution_time,
            nodes_executed=result.get("nodes_executed", 0),
            results=node_results,
            error=result.get("error")
        )
    except Exception as e:
        execution_time = time.time() - start_time
        return PipelineExecuteResponse(
            success=False,
            pipeline_id=request.pipeline.pipeline_id,
            execution_time=execution_time,
            nodes_executed=0,
            results={},
            error=str(e)
        )


# Pipeline Storage Endpoints
@router.post("/pipelines/save", response_model=PipelineSaveResponse)
async def save_pipeline(request: PipelineSaveRequest):
    """Save a pipeline."""
    if _pipeline_repository is None:
        raise HTTPException(status_code=500, detail="Pipeline repository not initialized")

    try:
        pipeline_def = request.pipeline.model_dump()
        pipeline_id = pipeline_def.get("pipeline_id")

        if not pipeline_id:
            raise HTTPException(status_code=400, detail="Pipeline ID is required")

        await _pipeline_repository.save(pipeline_id, pipeline_def)

        return PipelineSaveResponse(
            success=True,
            pipeline_id=pipeline_id,
            message=f"Pipeline '{pipeline_id}' saved successfully"
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save pipeline: {str(e)}")


@router.get("/pipelines", response_model=PipelineListResponse)
async def list_pipelines():
    """List all saved pipelines."""
    if _pipeline_repository is None:
        raise HTTPException(status_code=500, detail="Pipeline repository not initialized")

    try:
        pipelines_meta = await _pipeline_repository.list_all()

        pipelines = [
            PipelineMetadata(
                id=p["id"],
                name=p["name"],
                created_at=p["created_at"],
                updated_at=p["updated_at"]
            )
            for p in pipelines_meta
        ]

        return PipelineListResponse(
            pipelines=pipelines,
            count=len(pipelines)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list pipelines: {str(e)}")


@router.get("/pipelines/{pipeline_id}", response_model=PipelineGetResponse)
async def get_pipeline(pipeline_id: str):
    """Get a specific pipeline by ID."""
    if _pipeline_repository is None:
        raise HTTPException(status_code=500, detail="Pipeline repository not initialized")

    try:
        pipeline_data = await _pipeline_repository.get(pipeline_id)

        if pipeline_data is None:
            raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_id}' not found")

        return PipelineGetResponse(pipeline=pipeline_data)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get pipeline: {str(e)}")


@router.delete("/pipelines/{pipeline_id}", response_model=PipelineDeleteResponse)
async def delete_pipeline(pipeline_id: str):
    """Delete a pipeline."""
    if _pipeline_repository is None:
        raise HTTPException(status_code=500, detail="Pipeline repository not initialized")

    try:
        success = await _pipeline_repository.delete(pipeline_id)

        if not success:
            raise HTTPException(status_code=404, detail=f"Pipeline '{pipeline_id}' not found")

        return PipelineDeleteResponse(
            success=True,
            pipeline_id=pipeline_id,
            message=f"Pipeline '{pipeline_id}' deleted successfully"
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete pipeline: {str(e)}")
