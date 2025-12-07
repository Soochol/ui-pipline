"""Composite Node entity definition."""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from datetime import datetime


@dataclass
class CompositeInput:
    """Input pin mapping for Composite Node."""
    name: str           # External pin name
    type: str           # Data type (trigger, number, string, etc.)
    maps_to: str        # Internal node.pin (e.g., "node1.input1")
    description: str = ""
    default_value: Any = None


@dataclass
class CompositeOutput:
    """Output pin mapping for Composite Node."""
    name: str           # External pin name
    type: str           # Data type
    maps_from: str      # Internal node.pin (e.g., "node5.output1")
    description: str = ""


@dataclass
class CompositeNodeDefinition:
    """
    Composite Node Definition.

    A Composite Node encapsulates a subgraph (sub-pipeline) that can be
    reused across different pipelines as a single node.
    """
    composite_id: str
    name: str
    description: str

    # Internal pipeline structure
    subgraph: Dict[str, Any]  # {"nodes": [...], "edges": [...]}

    # Input/Output mappings
    inputs: List[CompositeInput] = field(default_factory=list)
    outputs: List[CompositeOutput] = field(default_factory=list)

    # Metadata
    category: str = "Composite"
    color: str = "#9b59b6"
    author: str = ""
    version: str = "1.0.0"

    # Timestamps
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    def __post_init__(self):
        """Initialize timestamps if not provided."""
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.updated_at is None:
            self.updated_at = datetime.now()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "composite_id": self.composite_id,
            "name": self.name,
            "description": self.description,
            "subgraph": self.subgraph,
            "inputs": [
                {
                    "name": inp.name,
                    "type": inp.type,
                    "maps_to": inp.maps_to,
                    "description": inp.description,
                    "default_value": inp.default_value,
                }
                for inp in self.inputs
            ],
            "outputs": [
                {
                    "name": out.name,
                    "type": out.type,
                    "maps_from": out.maps_from,
                    "description": out.description,
                }
                for out in self.outputs
            ],
            "category": self.category,
            "color": self.color,
            "author": self.author,
            "version": self.version,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "CompositeNodeDefinition":
        """Create from dictionary."""
        inputs = [
            CompositeInput(
                name=inp["name"],
                type=inp["type"],
                maps_to=inp["maps_to"],
                description=inp.get("description", ""),
                default_value=inp.get("default_value"),
            )
            for inp in data.get("inputs", [])
        ]

        outputs = [
            CompositeOutput(
                name=out["name"],
                type=out["type"],
                maps_from=out["maps_from"],
                description=out.get("description", ""),
            )
            for out in data.get("outputs", [])
        ]

        created_at = None
        if data.get("created_at"):
            created_at = datetime.fromisoformat(data["created_at"])

        updated_at = None
        if data.get("updated_at"):
            updated_at = datetime.fromisoformat(data["updated_at"])

        return cls(
            composite_id=data["composite_id"],
            name=data["name"],
            description=data.get("description", ""),
            subgraph=data.get("subgraph", {"nodes": [], "edges": []}),
            inputs=inputs,
            outputs=outputs,
            category=data.get("category", "Composite"),
            color=data.get("color", "#9b59b6"),
            author=data.get("author", ""),
            version=data.get("version", "1.0.0"),
            created_at=created_at,
            updated_at=updated_at,
        )

    def get_node_representation(self) -> Dict[str, Any]:
        """
        Get the node representation for use in pipeline canvas.

        Returns a node definition that can be added to a pipeline.
        """
        return {
            "type": "composite",
            "composite_id": self.composite_id,
            "label": self.name,
            "category": self.category,
            "color": self.color,
            "inputs": [
                {"name": inp.name, "type": inp.type}
                for inp in self.inputs
            ],
            "outputs": [
                {"name": out.name, "type": out.type}
                for out in self.outputs
            ],
        }

    def validate(self) -> List[str]:
        """
        Validate the composite node definition.

        Returns a list of validation errors (empty if valid).
        """
        errors = []

        if not self.composite_id:
            errors.append("composite_id is required")

        if not self.name:
            errors.append("name is required")

        if not self.subgraph:
            errors.append("subgraph is required")
        elif not isinstance(self.subgraph, dict):
            errors.append("subgraph must be a dictionary")
        else:
            if "nodes" not in self.subgraph:
                errors.append("subgraph must contain 'nodes'")
            if "edges" not in self.subgraph:
                errors.append("subgraph must contain 'edges'")

        # Validate input mappings
        for inp in self.inputs:
            if not inp.maps_to or "." not in inp.maps_to:
                errors.append(f"Invalid input mapping for '{inp.name}': maps_to must be 'node_id.pin_name'")

        # Validate output mappings
        for out in self.outputs:
            if not out.maps_from or "." not in out.maps_from:
                errors.append(f"Invalid output mapping for '{out.name}': maps_from must be 'node_id.pin_name'")

        return errors
