"""Plugin API routes - refactored with Use Cases."""

from fastapi import APIRouter, HTTPException, Depends
from dependency_injector.wiring import inject, Provide

from api.models import PluginListResponse
from domain.use_cases.plugin_use_cases import ListPluginsUseCase
from infrastructure.di_container import Container

router = APIRouter(prefix="/plugins", tags=["plugins"])


@router.get("", response_model=PluginListResponse)
@inject
async def list_plugins(
    use_case: ListPluginsUseCase = Depends(Provide[Container.list_plugins_use_case]),
):
    """Get list of available plugins."""
    try:
        plugins = await use_case.execute()
        return PluginListResponse(plugins=plugins, count=len(plugins))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to list plugins: {str(e)}"
        )
