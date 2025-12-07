"""Composite Node-related use cases."""

from typing import Dict, Any, List
from datetime import datetime
import uuid

from domain.entities.composite import CompositeNodeDefinition, CompositeInput, CompositeOutput
from domain.repositories.composite_repository import ICompositeRepository


class ListCompositesUseCase:
    """Use case for listing all composite nodes."""

    def __init__(self, composite_repository: ICompositeRepository):
        self.composite_repository = composite_repository

    async def execute(self, category: str = None) -> List[Dict[str, Any]]:
        """
        List all saved composite nodes.

        Args:
            category: Optional category filter

        Returns:
            List of composite metadata dictionaries

        Raises:
            ValueError: If repository not initialized
        """
        if self.composite_repository is None:
            raise ValueError("Composite repository not initialized")

        if category:
            composites = await self.composite_repository.get_by_category(category)
            return [c.to_dict() for c in composites]

        composites_meta = await self.composite_repository.list_all()
        return composites_meta


class GetCompositeUseCase:
    """Use case for retrieving a composite node."""

    def __init__(self, composite_repository: ICompositeRepository):
        self.composite_repository = composite_repository

    async def execute(self, composite_id: str) -> Dict[str, Any]:
        """
        Get a composite by ID.

        Args:
            composite_id: Composite identifier

        Returns:
            Composite definition dictionary

        Raises:
            ValueError: If composite not found or repository not initialized
        """
        if self.composite_repository is None:
            raise ValueError("Composite repository not initialized")

        composite = await self.composite_repository.get(composite_id)

        if composite is None:
            raise ValueError(f"Composite '{composite_id}' not found")

        return composite.to_dict()


class CreateCompositeUseCase:
    """Use case for creating a new composite node."""

    def __init__(self, composite_repository: ICompositeRepository):
        self.composite_repository = composite_repository

    def _check_circular_reference(
        self,
        composite_id: str,
        subgraph: Dict[str, Any],
        checked_ids: set = None
    ) -> List[str]:
        """
        Check for circular references in composite nodes.

        Args:
            composite_id: ID of the composite being created/updated
            subgraph: Subgraph definition
            checked_ids: Set of already checked composite IDs

        Returns:
            List of error messages if circular references found
        """
        if checked_ids is None:
            checked_ids = set()

        errors = []
        nodes = subgraph.get("nodes", [])

        for node in nodes:
            node_type = node.get("type")
            if node_type == "composite":
                nested_composite_id = node.get("composite_id")

                # Check for direct self-reference
                if nested_composite_id == composite_id:
                    errors.append(
                        f"Circular reference: Composite '{composite_id}' cannot contain itself"
                    )
                    continue

                # Check if we've already visited this composite (indirect circular reference)
                if nested_composite_id in checked_ids:
                    errors.append(
                        f"Circular reference detected: '{nested_composite_id}' already in chain"
                    )
                    continue

        return errors

    async def execute(self, composite_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new composite node.

        Args:
            composite_data: Composite definition data

        Returns:
            Created composite with ID

        Raises:
            ValueError: If data is invalid or repository not initialized
        """
        if self.composite_repository is None:
            raise ValueError("Composite repository not initialized")

        # Generate ID if not provided
        composite_id = composite_data.get("composite_id")
        if not composite_id:
            composite_id = f"composite_{uuid.uuid4().hex[:8]}"
            composite_data["composite_id"] = composite_id

        # Check for circular references
        subgraph = composite_data.get("subgraph", {"nodes": [], "edges": []})
        circular_errors = self._check_circular_reference(composite_id, subgraph)
        if circular_errors:
            raise ValueError(f"Circular reference detected: {', '.join(circular_errors)}")

        # Parse inputs
        inputs = []
        for inp_data in composite_data.get("inputs", []):
            inputs.append(CompositeInput(
                name=inp_data["name"],
                type=inp_data["type"],
                maps_to=inp_data["maps_to"],
                description=inp_data.get("description", ""),
                default_value=inp_data.get("default_value"),
            ))

        # Parse outputs
        outputs = []
        for out_data in composite_data.get("outputs", []):
            outputs.append(CompositeOutput(
                name=out_data["name"],
                type=out_data["type"],
                maps_from=out_data["maps_from"],
                description=out_data.get("description", ""),
            ))

        # Create composite entity
        composite = CompositeNodeDefinition(
            composite_id=composite_id,
            name=composite_data.get("name", "Untitled Composite"),
            description=composite_data.get("description", ""),
            subgraph=composite_data.get("subgraph", {"nodes": [], "edges": []}),
            inputs=inputs,
            outputs=outputs,
            category=composite_data.get("category", "Composite"),
            color=composite_data.get("color", "#9b59b6"),
            author=composite_data.get("author", ""),
            version=composite_data.get("version", "1.0.0"),
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

        # Validate
        errors = composite.validate()
        if errors:
            raise ValueError(f"Invalid composite: {', '.join(errors)}")

        # Save
        await self.composite_repository.save(composite)

        return {
            "success": True,
            "composite_id": composite_id,
            "message": f"Composite '{composite.name}' created successfully",
            "composite": composite.to_dict(),
        }


class UpdateCompositeUseCase:
    """Use case for updating an existing composite node."""

    def __init__(self, composite_repository: ICompositeRepository):
        self.composite_repository = composite_repository

    def _check_circular_reference(
        self,
        composite_id: str,
        subgraph: Dict[str, Any],
    ) -> List[str]:
        """Check for circular references."""
        errors = []
        nodes = subgraph.get("nodes", [])

        for node in nodes:
            if node.get("type") == "composite":
                nested_id = node.get("composite_id")
                if nested_id == composite_id:
                    errors.append(
                        f"Composite '{composite_id}' cannot contain itself"
                    )
        return errors

    async def execute(self, composite_id: str, composite_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update an existing composite.

        Args:
            composite_id: Composite identifier
            composite_data: Updated composite data

        Returns:
            Update result with status

        Raises:
            ValueError: If composite not found or data is invalid
        """
        if self.composite_repository is None:
            raise ValueError("Composite repository not initialized")

        # Get existing composite
        existing = await self.composite_repository.get(composite_id)
        if existing is None:
            raise ValueError(f"Composite '{composite_id}' not found")

        # Check for circular references if subgraph is being updated
        if "subgraph" in composite_data:
            circular_errors = self._check_circular_reference(
                composite_id, composite_data["subgraph"]
            )
            if circular_errors:
                raise ValueError(f"Circular reference: {', '.join(circular_errors)}")

        # Parse inputs
        inputs = []
        for inp_data in composite_data.get("inputs", []):
            inputs.append(CompositeInput(
                name=inp_data["name"],
                type=inp_data["type"],
                maps_to=inp_data["maps_to"],
                description=inp_data.get("description", ""),
                default_value=inp_data.get("default_value"),
            ))

        # Parse outputs
        outputs = []
        for out_data in composite_data.get("outputs", []):
            outputs.append(CompositeOutput(
                name=out_data["name"],
                type=out_data["type"],
                maps_from=out_data["maps_from"],
                description=out_data.get("description", ""),
            ))

        # Create updated composite entity
        updated = CompositeNodeDefinition(
            composite_id=composite_id,
            name=composite_data.get("name", existing.name),
            description=composite_data.get("description", existing.description),
            subgraph=composite_data.get("subgraph", existing.subgraph),
            inputs=inputs if inputs else existing.inputs,
            outputs=outputs if outputs else existing.outputs,
            category=composite_data.get("category", existing.category),
            color=composite_data.get("color", existing.color),
            author=composite_data.get("author", existing.author),
            version=composite_data.get("version", existing.version),
            created_at=existing.created_at,
            updated_at=datetime.now(),
        )

        # Validate
        errors = updated.validate()
        if errors:
            raise ValueError(f"Invalid composite: {', '.join(errors)}")

        # Update
        success = await self.composite_repository.update(composite_id, updated)
        if not success:
            raise ValueError(f"Failed to update composite '{composite_id}'")

        return {
            "success": True,
            "composite_id": composite_id,
            "message": f"Composite '{updated.name}' updated successfully",
            "composite": updated.to_dict(),
        }


class DeleteCompositeUseCase:
    """Use case for deleting a composite node."""

    def __init__(self, composite_repository: ICompositeRepository):
        self.composite_repository = composite_repository

    async def execute(self, composite_id: str) -> Dict[str, Any]:
        """
        Delete a composite by ID.

        Args:
            composite_id: Composite identifier

        Returns:
            Deletion result with status

        Raises:
            ValueError: If composite not found or repository not initialized
        """
        if self.composite_repository is None:
            raise ValueError("Composite repository not initialized")

        success = await self.composite_repository.delete(composite_id)

        if not success:
            raise ValueError(f"Composite '{composite_id}' not found")

        return {
            "success": True,
            "composite_id": composite_id,
            "message": f"Composite '{composite_id}' deleted successfully",
        }


class CreateCompositeFromNodesUseCase:
    """Use case for creating a composite from selected nodes."""

    def __init__(self, composite_repository: ICompositeRepository):
        self.composite_repository = composite_repository

    async def execute(
        self,
        name: str,
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]],
        external_edges: List[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Create a composite from selected nodes.

        Automatically analyzes the nodes and edges to determine
        input and output pin mappings.

        Args:
            name: Name for the composite
            nodes: List of node definitions
            edges: List of edges between the nodes
            external_edges: List of edges connecting to nodes outside the selection

        Returns:
            Created composite with ID

        Raises:
            ValueError: If data is invalid
        """
        if self.composite_repository is None:
            raise ValueError("Composite repository not initialized")

        if not nodes:
            raise ValueError("At least one node is required")

        # Generate ID
        composite_id = f"composite_{uuid.uuid4().hex[:8]}"

        # Collect node IDs
        node_ids = {node["id"] for node in nodes}

        # Analyze external connections to determine inputs/outputs
        inputs = []
        outputs = []

        external_edges = external_edges or []

        for edge in external_edges:
            source_id = edge.get("source")
            target_id = edge.get("target")
            source_handle = edge.get("sourceHandle", edge.get("source_handle", "output"))
            target_handle = edge.get("targetHandle", edge.get("target_handle", "input"))

            if source_id not in node_ids and target_id in node_ids:
                # External source -> internal target = input
                input_name = f"in_{target_handle}"
                # Find the type from the target node
                input_type = "any"
                for node in nodes:
                    if node["id"] == target_id:
                        for inp in node.get("data", {}).get("inputs", []):
                            if inp["name"] == target_handle:
                                input_type = inp.get("type", "any")
                                break
                        break

                inputs.append(CompositeInput(
                    name=input_name,
                    type=input_type,
                    maps_to=f"{target_id}.{target_handle}",
                ))

            elif source_id in node_ids and target_id not in node_ids:
                # Internal source -> external target = output
                output_name = f"out_{source_handle}"
                # Find the type from the source node
                output_type = "any"
                for node in nodes:
                    if node["id"] == source_id:
                        for out in node.get("data", {}).get("outputs", []):
                            if out["name"] == source_handle:
                                output_type = out.get("type", "any")
                                break
                        break

                outputs.append(CompositeOutput(
                    name=output_name,
                    type=output_type,
                    maps_from=f"{source_id}.{source_handle}",
                ))

        # If no external edges, try to find entry/exit points
        if not inputs and not outputs:
            # Find nodes with no incoming internal edges (entry points)
            internal_targets = {edge["target"] for edge in edges}
            for node in nodes:
                if node["id"] not in internal_targets:
                    # This is an entry node
                    for inp in node.get("data", {}).get("inputs", []):
                        inputs.append(CompositeInput(
                            name=inp["name"],
                            type=inp.get("type", "any"),
                            maps_to=f"{node['id']}.{inp['name']}",
                        ))

            # Find nodes with no outgoing internal edges (exit points)
            internal_sources = {edge["source"] for edge in edges}
            for node in nodes:
                if node["id"] not in internal_sources:
                    # This is an exit node
                    for out in node.get("data", {}).get("outputs", []):
                        outputs.append(CompositeOutput(
                            name=out["name"],
                            type=out.get("type", "any"),
                            maps_from=f"{node['id']}.{out['name']}",
                        ))

        # Create composite
        composite = CompositeNodeDefinition(
            composite_id=composite_id,
            name=name,
            description=f"Composite created from {len(nodes)} nodes",
            subgraph={"nodes": nodes, "edges": edges},
            inputs=inputs,
            outputs=outputs,
            category="Composite",
            color="#9b59b6",
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )

        # Save
        await self.composite_repository.save(composite)

        return {
            "success": True,
            "composite_id": composite_id,
            "message": f"Composite '{name}' created from {len(nodes)} nodes",
            "composite": composite.to_dict(),
        }
