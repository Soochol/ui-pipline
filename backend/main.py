"""Main FastAPI application for UI Pipeline System."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.plugin_loader import PluginLoader
from core.device_manager import DeviceManager
from core.execution_engine import ExecutionEngine
from api.routes import router as legacy_router, set_managers
from api.v1.routes.websocket import websocket_endpoint
from api.v1.routes.devices import router as devices_router
from api.v1.routes.plugins import router as plugins_router
from api.v1.routes.pipelines import router as pipelines_router
from api.v1.routes.composites import router as composites_router
from api.exceptions import register_exception_handlers
from domain.events import event_bus
from infrastructure.storage import JsonPipelineRepository, JsonCompositeRepository
from infrastructure.di_container import Container

# Setup logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting UI Pipeline System...")
    logger.info(f"Plugin directory: {settings.PLUGIN_DIR}")

    # Initialize managers
    plugin_loader = PluginLoader(str(settings.PLUGIN_DIR))
    device_manager = DeviceManager(plugin_loader)
    execution_engine = ExecutionEngine(device_manager, plugin_loader, event_bus)
    pipeline_repository = JsonPipelineRepository()
    composite_repository = JsonCompositeRepository()

    # Discover plugins
    plugins = await plugin_loader.discover_plugins()
    logger.info(f"Discovered {len(plugins)} plugins")

    # Set managers for legacy routes (backward compatibility)
    set_managers(plugin_loader, device_manager, execution_engine, pipeline_repository)

    # Initialize DI container
    container = Container()
    container.plugin_loader.override(plugin_loader)
    container.device_manager.override(device_manager)
    container.execution_engine.override(execution_engine)
    container.pipeline_repository.override(pipeline_repository)
    container.composite_repository.override(composite_repository)

    # Wire dependencies for new routes
    container.wire(modules=[
        "api.v1.routes.devices",
        "api.v1.routes.plugins",
        "api.v1.routes.pipelines",
        "api.v1.routes.composites",
    ])

    # Store container in app state
    app.state.container = container

    logger.info("UI Pipeline System started successfully")

    yield

    # Shutdown
    logger.info("Shutting down UI Pipeline System...")
    # Unwire container
    container.unwire()
    logger.info("UI Pipeline System shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="UI Pipeline System API",
    description="Backend API for node-based visual programming system for industrial automation",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register exception handlers
register_exception_handlers(app)

# Include routers - New DI-based routes (v1)
app.include_router(devices_router, prefix=settings.API_PREFIX)
app.include_router(plugins_router, prefix=settings.API_PREFIX)
app.include_router(pipelines_router, prefix=settings.API_PREFIX)
app.include_router(composites_router, prefix=settings.API_PREFIX)

# Legacy routes (for backward compatibility)
app.include_router(legacy_router, prefix=settings.API_PREFIX + "/legacy", tags=["legacy"])

# WebSocket endpoint
app.websocket("/ws")(websocket_endpoint)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "UI Pipeline System API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "api": settings.API_PREFIX
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
