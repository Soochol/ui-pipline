"""Pipeline execution domain events."""

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, Optional


@dataclass
class PipelineStartedEvent:
    """Event published when pipeline execution starts."""

    pipeline_id: str
    pipeline_name: str
    timestamp: datetime
    node_count: int

    def to_dict(self):
        """Convert to dictionary for JSON serialization."""
        return {
            "type": "pipeline_started",
            "pipeline_id": self.pipeline_id,
            "pipeline_name": self.pipeline_name,
            "timestamp": self.timestamp.isoformat(),
            "node_count": self.node_count
        }


@dataclass
class NodeExecutingEvent:
    """Event published when a node starts executing."""

    pipeline_id: str
    node_id: str
    node_type: str
    function_id: Optional[str]
    timestamp: datetime
    label: Optional[str] = None
    iteration: Optional[int] = None
    total_iterations: Optional[int] = None

    def to_dict(self):
        """Convert to dictionary for JSON serialization."""
        result = {
            "type": "node_executing",
            "pipeline_id": self.pipeline_id,
            "node_id": self.node_id,
            "node_type": self.node_type,
            "function_id": self.function_id,
            "timestamp": self.timestamp.isoformat(),
            "label": self.label or self.node_id,
        }
        if self.iteration is not None:
            result["iteration"] = self.iteration
            result["total_iterations"] = self.total_iterations
        return result


@dataclass
class NodeCompletedEvent:
    """Event published when a node completes execution."""

    pipeline_id: str
    node_id: str
    timestamp: datetime
    outputs: Dict[str, Any]
    execution_time: float
    label: Optional[str] = None

    def to_dict(self):
        """Convert to dictionary for JSON serialization."""
        return {
            "type": "node_completed",
            "pipeline_id": self.pipeline_id,
            "node_id": self.node_id,
            "label": self.label or self.node_id,
            "timestamp": self.timestamp.isoformat(),
            "outputs": self.outputs,
            "execution_time": self.execution_time
        }


@dataclass
class PipelineCompletedEvent:
    """Event published when pipeline execution completes."""

    pipeline_id: str
    timestamp: datetime
    success: bool
    execution_time: float
    nodes_executed: int

    def to_dict(self):
        """Convert to dictionary for JSON serialization."""
        return {
            "type": "pipeline_completed",
            "pipeline_id": self.pipeline_id,
            "timestamp": self.timestamp.isoformat(),
            "success": self.success,
            "execution_time": self.execution_time,
            "nodes_executed": self.nodes_executed
        }


@dataclass
class PipelineErrorEvent:
    """Event published when pipeline execution fails."""

    pipeline_id: str
    timestamp: datetime
    error_message: str
    node_id: Optional[str] = None
    error_type: Optional[str] = None

    def to_dict(self):
        """Convert to dictionary for JSON serialization."""
        return {
            "type": "pipeline_error",
            "pipeline_id": self.pipeline_id,
            "timestamp": self.timestamp.isoformat(),
            "error_message": self.error_message,
            "node_id": self.node_id,
            "error_type": self.error_type
        }
