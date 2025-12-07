"""Device API routes - refactored with Use Cases."""

from fastapi import APIRouter, HTTPException, Depends
from dependency_injector.wiring import inject, Provide

from api.models import (
    DeviceCreateRequest,
    DeviceResponse,
    DeviceListResponse,
    DeviceDeleteResponse,
    FunctionExecuteRequest,
    FunctionExecuteResponse,
)
from domain.use_cases.device_use_cases import (
    ListDevicesUseCase,
    CreateDeviceUseCase,
    DeleteDeviceUseCase,
    ExecuteFunctionUseCase,
)
from infrastructure.di_container import Container

router = APIRouter(prefix="/devices", tags=["devices"])


@router.get("", response_model=DeviceListResponse)
@inject
async def list_devices(
    use_case: ListDevicesUseCase = Depends(Provide[Container.list_devices_use_case]),
):
    """Get list of device instances."""
    try:
        devices = await use_case.execute()
        return DeviceListResponse(devices=devices, count=len(devices))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to list devices: {str(e)}"
        )


@router.post("", response_model=DeviceResponse)
@inject
async def create_device(
    request: DeviceCreateRequest,
    use_case: CreateDeviceUseCase = Depends(Provide[Container.create_device_use_case]),
):
    """Create a new device instance."""
    try:
        result = await use_case.execute(
            plugin_id=request.plugin_id,
            instance_id=request.instance_id,
            config=request.config,
        )

        return DeviceResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create device: {str(e)}"
        )


@router.delete("/{instance_id}", response_model=DeviceDeleteResponse)
@inject
async def delete_device(
    instance_id: str,
    use_case: DeleteDeviceUseCase = Depends(Provide[Container.delete_device_use_case]),
):
    """Delete a device instance."""
    try:
        result = await use_case.execute(instance_id)
        return DeviceDeleteResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete device: {str(e)}"
        )


@router.post("/function", response_model=FunctionExecuteResponse)
@inject
async def execute_function(
    request: FunctionExecuteRequest,
    use_case: ExecuteFunctionUseCase = Depends(
        Provide[Container.execute_function_use_case]
    ),
):
    """Execute a device function."""
    try:
        result = await use_case.execute(
            instance_id=request.instance_id,
            function_id=request.function_id,
            inputs=request.inputs,
        )

        return FunctionExecuteResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        # Use case already handles errors gracefully
        result = {
            "success": False,
            "instance_id": request.instance_id,
            "function_id": request.function_id,
            "error": str(e),
            "execution_time": 0.0,
        }
        return FunctionExecuteResponse(**result)
