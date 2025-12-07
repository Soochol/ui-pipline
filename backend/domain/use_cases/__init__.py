"""Use cases for business logic."""

from .device_use_cases import (
    ListDevicesUseCase,
    CreateDeviceUseCase,
    DeleteDeviceUseCase,
    ExecuteFunctionUseCase,
)
from .plugin_use_cases import ListPluginsUseCase
from .pipeline_use_cases import (
    ExecutePipelineUseCase,
    SavePipelineUseCase,
    GetPipelineUseCase,
    ListPipelinesUseCase,
    DeletePipelineUseCase,
)
from .composite_use_cases import (
    ListCompositesUseCase,
    GetCompositeUseCase,
    CreateCompositeUseCase,
    UpdateCompositeUseCase,
    DeleteCompositeUseCase,
    CreateCompositeFromNodesUseCase,
)

__all__ = [
    # Device use cases
    "ListDevicesUseCase",
    "CreateDeviceUseCase",
    "DeleteDeviceUseCase",
    "ExecuteFunctionUseCase",
    # Plugin use cases
    "ListPluginsUseCase",
    # Pipeline use cases
    "ExecutePipelineUseCase",
    "SavePipelineUseCase",
    "GetPipelineUseCase",
    "ListPipelinesUseCase",
    "DeletePipelineUseCase",
    # Composite use cases
    "ListCompositesUseCase",
    "GetCompositeUseCase",
    "CreateCompositeUseCase",
    "UpdateCompositeUseCase",
    "DeleteCompositeUseCase",
    "CreateCompositeFromNodesUseCase",
]
