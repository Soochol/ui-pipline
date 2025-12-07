"""Dependency Injection Container configuration."""

from dependency_injector import containers, providers

from domain.use_cases.device_use_cases import (
    ListDevicesUseCase,
    CreateDeviceUseCase,
    DeleteDeviceUseCase,
    ExecuteFunctionUseCase,
)
from domain.use_cases.plugin_use_cases import ListPluginsUseCase
from domain.use_cases.pipeline_use_cases import (
    ExecutePipelineUseCase,
    SavePipelineUseCase,
    GetPipelineUseCase,
    ListPipelinesUseCase,
    DeletePipelineUseCase,
)
from domain.use_cases.composite_use_cases import (
    ListCompositesUseCase,
    GetCompositeUseCase,
    CreateCompositeUseCase,
    UpdateCompositeUseCase,
    DeleteCompositeUseCase,
    CreateCompositeFromNodesUseCase,
)


class Container(containers.DeclarativeContainer):
    """Application DI container."""

    # Configuration
    config = providers.Configuration()

    # Managers (injected from main.py)
    plugin_loader = providers.Dependency()
    device_manager = providers.Dependency()
    execution_engine = providers.Dependency()
    pipeline_repository = providers.Dependency()
    composite_repository = providers.Dependency()

    # Plugin Use Cases
    list_plugins_use_case = providers.Factory(
        ListPluginsUseCase, plugin_loader=plugin_loader
    )

    # Device Use Cases
    list_devices_use_case = providers.Factory(
        ListDevicesUseCase, device_manager=device_manager
    )

    create_device_use_case = providers.Factory(
        CreateDeviceUseCase, device_manager=device_manager
    )

    delete_device_use_case = providers.Factory(
        DeleteDeviceUseCase, device_manager=device_manager
    )

    execute_function_use_case = providers.Factory(
        ExecuteFunctionUseCase, device_manager=device_manager
    )

    # Pipeline Use Cases
    execute_pipeline_use_case = providers.Factory(
        ExecutePipelineUseCase, execution_engine=execution_engine
    )

    save_pipeline_use_case = providers.Factory(
        SavePipelineUseCase, pipeline_repository=pipeline_repository
    )

    get_pipeline_use_case = providers.Factory(
        GetPipelineUseCase, pipeline_repository=pipeline_repository
    )

    list_pipelines_use_case = providers.Factory(
        ListPipelinesUseCase, pipeline_repository=pipeline_repository
    )

    delete_pipeline_use_case = providers.Factory(
        DeletePipelineUseCase, pipeline_repository=pipeline_repository
    )

    # Composite Use Cases
    list_composites_use_case = providers.Factory(
        ListCompositesUseCase, composite_repository=composite_repository
    )

    get_composite_use_case = providers.Factory(
        GetCompositeUseCase, composite_repository=composite_repository
    )

    create_composite_use_case = providers.Factory(
        CreateCompositeUseCase, composite_repository=composite_repository
    )

    update_composite_use_case = providers.Factory(
        UpdateCompositeUseCase, composite_repository=composite_repository
    )

    delete_composite_use_case = providers.Factory(
        DeleteCompositeUseCase, composite_repository=composite_repository
    )

    create_composite_from_nodes_use_case = providers.Factory(
        CreateCompositeFromNodesUseCase, composite_repository=composite_repository
    )
