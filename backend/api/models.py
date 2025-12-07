"""Pydantic models for API requests and responses."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


# Health Check
class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    message: str = "UI Pipeline System is running"


# Plugin Models
class PluginInfo(BaseModel):
    """Plugin information."""
    id: str
    name: str
    version: str
    author: str
    description: str
    category: str
    color: str
    device_class: str
    connection_types: List[str]
    functions: List[Dict[str, Any]]


class PluginListResponse(BaseModel):
    """List of available plugins."""
    plugins: List[PluginInfo]
    count: int


# Device Models
class DeviceCreateRequest(BaseModel):
    """Request to create a device instance."""
    plugin_id: str = Field(..., description="Plugin ID")
    instance_id: str = Field(..., description="Unique instance identifier")
    config: Dict[str, Any] = Field(default_factory=dict, description="Device configuration")


class DeviceResponse(BaseModel):
    """Device instance information."""
    instance_id: str
    plugin_id: str
    status: str
    config: Dict[str, Any]
    error: Optional[str] = None


class DeviceListResponse(BaseModel):
    """List of device instances."""
    devices: List[DeviceResponse]
    count: int


class DeviceDeleteResponse(BaseModel):
    """Device deletion response."""
    success: bool
    instance_id: str
    message: str


# Pipeline Execution Models
class NodeDefinition(BaseModel):
    """Node definition in pipeline."""
    id: str
    type: str
    plugin_id: str
    device_instance: str
    function_id: str
    config: Dict[str, Any] = Field(default_factory=dict)
    position: Dict[str, float] = Field(default_factory=dict)


class EdgeDefinition(BaseModel):
    """Edge definition in pipeline."""
    id: str
    source: str
    source_handle: str
    target: str
    target_handle: str


class PipelineDefinition(BaseModel):
    """Complete pipeline definition."""
    pipeline_id: str
    name: str = "Untitled Pipeline"
    nodes: List[NodeDefinition]
    edges: List[EdgeDefinition]
    variables: Dict[str, Any] = Field(default_factory=dict)


class PipelineExecuteRequest(BaseModel):
    """Request to execute a pipeline."""
    pipeline: PipelineDefinition


class NodeExecutionResult(BaseModel):
    """Result of a single node execution."""
    node_id: str
    status: str
    outputs: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None
    execution_time: float = 0.0


class PipelineExecuteResponse(BaseModel):
    """Pipeline execution response."""
    success: bool
    pipeline_id: str
    execution_time: float
    nodes_executed: int
    results: Dict[str, NodeExecutionResult]
    error: Optional[str] = None


# Function Execution Models
class FunctionExecuteRequest(BaseModel):
    """Request to execute a device function."""
    instance_id: str
    function_id: str
    inputs: Dict[str, Any] = Field(default_factory=dict)


class FunctionExecuteResponse(BaseModel):
    """Function execution response."""
    success: bool
    instance_id: str
    function_id: str
    outputs: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None
    execution_time: float = 0.0


# Pipeline Storage Models
class PipelineSaveRequest(BaseModel):
    """Request to save a pipeline."""
    pipeline: PipelineDefinition


class PipelineSaveResponse(BaseModel):
    """Pipeline save response."""
    success: bool
    pipeline_id: str
    message: str


class PipelineMetadata(BaseModel):
    """Pipeline metadata for listing."""
    id: str
    name: str
    created_at: str
    updated_at: str


class PipelineListResponse(BaseModel):
    """List of saved pipelines."""
    pipelines: List[PipelineMetadata]
    count: int


class PipelineGetResponse(BaseModel):
    """Single pipeline response."""
    pipeline: PipelineDefinition


class PipelineDeleteResponse(BaseModel):
    """Pipeline deletion response."""
    success: bool
    pipeline_id: str
    message: str


# Composite Node Models
class CompositeInputDefinition(BaseModel):
    """Input pin mapping for composite node."""
    name: str
    type: str
    maps_to: str
    description: str = ""
    default_value: Any = None


class CompositeOutputDefinition(BaseModel):
    """Output pin mapping for composite node."""
    name: str
    type: str
    maps_from: str
    description: str = ""


class CompositeSubgraph(BaseModel):
    """Subgraph definition for composite node."""
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


class CompositeDefinition(BaseModel):
    """Complete composite node definition."""
    composite_id: Optional[str] = None
    name: str
    description: str = ""
    subgraph: CompositeSubgraph
    inputs: List[CompositeInputDefinition] = Field(default_factory=list)
    outputs: List[CompositeOutputDefinition] = Field(default_factory=list)
    category: str = "Composite"
    color: str = "#9b59b6"
    author: str = ""
    version: str = "1.0.0"


class CompositeCreateRequest(BaseModel):
    """Request to create a composite node."""
    composite: CompositeDefinition


class CompositeCreateFromNodesRequest(BaseModel):
    """Request to create a composite from selected nodes."""
    name: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    external_edges: List[Dict[str, Any]] = Field(default_factory=list)


class CompositeUpdateRequest(BaseModel):
    """Request to update a composite node."""
    composite: CompositeDefinition


class CompositeResponse(BaseModel):
    """Single composite node response."""
    success: bool
    composite_id: str
    message: str
    composite: Optional[Dict[str, Any]] = None


class CompositeMetadata(BaseModel):
    """Composite metadata for listing."""
    id: str
    name: str
    category: str
    color: str
    version: str
    author: str = ""
    input_count: int = 0
    output_count: int = 0
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class CompositeListResponse(BaseModel):
    """List of saved composites."""
    composites: List[CompositeMetadata]
    count: int


class CompositeGetResponse(BaseModel):
    """Single composite get response."""
    composite: Dict[str, Any]


class CompositeDeleteResponse(BaseModel):
    """Composite deletion response."""
    success: bool
    composite_id: str
    message: str
