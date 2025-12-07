"""Execution engine for pipeline execution."""

import asyncio
import logging
import time
from datetime import datetime
from typing import Any, Dict, List, Optional
import networkx as nx
from .device_manager import DeviceManager
from .plugin_loader import PluginLoader
from domain.exceptions import (
    PipelineExecutionError,
    NodeExecutionError,
    CircularDependencyError,
    ValidationError,
)

logger = logging.getLogger(__name__)

# Maximum depth for nested composite nodes
MAX_COMPOSITE_DEPTH = 5


class ExecutionEngine:
    """
    Pipeline execution engine.

    Executes pipelines by building a directed acyclic graph (DAG)
    and executing nodes in topological order.
    """

    def __init__(
        self,
        device_manager: DeviceManager,
        plugin_loader: PluginLoader,
        event_bus=None,
        composite_repository=None
    ):
        """
        Initialize execution engine.

        Args:
            device_manager: Device manager instance
            plugin_loader: Plugin loader instance
            event_bus: Event bus instance for publishing events (optional)
            composite_repository: Repository for composite node definitions (optional)
        """
        self.device_manager = device_manager
        self.plugin_loader = plugin_loader
        self.event_bus = event_bus
        self.composite_repository = composite_repository
        self.data_store: Dict[str, Dict[str, Any]] = {}

        logger.info("ExecutionEngine initialized")

    def set_composite_repository(self, composite_repository):
        """Set the composite repository after initialization."""
        self.composite_repository = composite_repository

    async def execute_pipeline(self, pipeline_def: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a complete pipeline.

        Args:
            pipeline_def: Pipeline definition containing nodes and edges

        Returns:
            Execution results
        """
        pipeline_id = pipeline_def.get("pipeline_id", "unknown")
        pipeline_name = pipeline_def.get("name", "Unknown Pipeline")
        logger.info(f"Executing pipeline: {pipeline_id}")

        start_time = time.time()

        try:
            # Build execution graph
            graph = self._build_execution_graph(pipeline_def)

            # Check for cycles
            if not nx.is_directed_acyclic_graph(graph):
                # Find cycles to provide better error message
                cycles = list(nx.simple_cycles(graph))
                cycle = cycles[0] if cycles else []
                raise CircularDependencyError(
                    cycle=[str(node) for node in cycle],
                    details={"all_cycles": [[str(n) for n in c] for c in cycles]}
                )

            # Get execution order (topological sort)
            try:
                execution_order = list(nx.topological_sort(graph))
            except nx.NetworkXError as e:
                raise PipelineExecutionError(
                    pipeline_id=pipeline_id,
                    message="Cannot determine execution order",
                    cause=e,
                    details={"error": str(e)}
                )

            logger.info(f"Execution order: {execution_order}")

            # Group nodes by execution level for parallel execution
            execution_levels = self._group_by_execution_level(graph, execution_order)

            # 🆕 Publish pipeline started event
            await self._publish_event("PipelineStartedEvent", {
                "pipeline_id": pipeline_id,
                "pipeline_name": pipeline_name,
                "timestamp": datetime.now(),
                "node_count": len(execution_order)
            })

            # Clear data store
            self.data_store = {}

            # Execute nodes level by level (parallel within each level)
            nodes_executed = 0
            for level_idx, level_nodes in enumerate(execution_levels):
                logger.info(f"Executing level {level_idx + 1}/{len(execution_levels)}: {len(level_nodes)} nodes in parallel")

                # Publish executing events for all nodes in this level
                for node_id in level_nodes:
                    node = self._find_node(node_id, pipeline_def)
                    node_label = node.get("label", node_id) if node else node_id
                    await self._publish_event("NodeExecutingEvent", {
                        "pipeline_id": pipeline_id,
                        "node_id": node_id,
                        "label": node_label,
                        "node_type": node.get("type") if node else "unknown",
                        "function_id": node.get("function_id") if node else None,
                        "timestamp": datetime.now()
                    })

                # Execute all nodes in this level in parallel
                level_start = time.time()
                await asyncio.gather(*[
                    self._execute_node(node_id, pipeline_def)
                    for node_id in level_nodes
                ])
                level_time = time.time() - level_start

                # Publish completed events for all nodes in this level
                for node_id in level_nodes:
                    node = self._find_node(node_id, pipeline_def)
                    node_label = node.get("label", node_id) if node else node_id
                    await self._publish_event("NodeCompletedEvent", {
                        "pipeline_id": pipeline_id,
                        "node_id": node_id,
                        "label": node_label,
                        "timestamp": datetime.now(),
                        "outputs": self.data_store.get(node_id, {}),
                        "execution_time": level_time
                    })

                nodes_executed += len(level_nodes)

            execution_time = time.time() - start_time

            logger.info(
                f"Pipeline '{pipeline_id}' completed successfully. "
                f"Executed {nodes_executed} nodes in {execution_time:.3f}s"
            )

            # 🆕 Publish pipeline completed event
            await self._publish_event("PipelineCompletedEvent", {
                "pipeline_id": pipeline_id,
                "timestamp": datetime.now(),
                "success": True,
                "execution_time": execution_time,
                "nodes_executed": nodes_executed
            })

            return {
                "success": True,
                "nodes_executed": nodes_executed,
                "execution_time": execution_time,
                "results": self.data_store
            }

        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Pipeline execution failed: {e}")

            # 🆕 Publish pipeline error event
            await self._publish_event("PipelineErrorEvent", {
                "pipeline_id": pipeline_id,
                "timestamp": datetime.now(),
                "error_message": str(e),
                "node_id": None,
                "error_type": type(e).__name__
            })

            return {
                "success": False,
                "nodes_executed": 0,
                "execution_time": execution_time,
                "results": self.data_store,
                "error": str(e)
            }

    def _build_execution_graph(self, pipeline_def: Dict[str, Any]) -> nx.DiGraph:
        """
        Build execution graph from pipeline definition.

        Args:
            pipeline_def: Pipeline definition

        Returns:
            Directed graph representing execution dependencies
        """
        graph = nx.DiGraph()

        # Add all nodes
        for node in pipeline_def.get("nodes", []):
            graph.add_node(node["id"])

        # Add edges (dependencies)
        for edge in pipeline_def.get("edges", []):
            source = edge["source"]
            target = edge["target"]
            graph.add_edge(source, target, edge_data=edge)

        logger.debug(f"Built execution graph with {len(graph.nodes)} nodes and {len(graph.edges)} edges")

        return graph

    async def _execute_node(
        self,
        node_id: str,
        pipeline_def: Dict[str, Any],
        depth: int = 0
    ):
        """
        Execute a single node.

        Args:
            node_id: Node identifier
            pipeline_def: Pipeline definition
            depth: Current nesting depth for composite nodes
        """
        node = self._find_node(node_id, pipeline_def)
        if node is None:
            raise NodeExecutionError(
                node_id=node_id,
                node_label="Unknown",
                message=f"Node '{node_id}' not found in pipeline definition"
            )

        logger.debug(f"Executing node: {node_id} (type: {node.get('type')})")

        node_type = node.get("type")

        if node_type == "function":
            try:
                result = await self._execute_function_node(node, pipeline_def)
            except Exception as e:
                # Wrap any exception in NodeExecutionError for consistency
                if isinstance(e, NodeExecutionError):
                    raise
                raise NodeExecutionError(
                    node_id=node_id,
                    node_label=node.get("label", node_id),
                    message=f"Failed to execute node: {str(e)}",
                    cause=e
                )
        elif node_type == "composite":
            try:
                result = await self._execute_composite_node(node, pipeline_def, depth)
            except Exception as e:
                if isinstance(e, NodeExecutionError):
                    raise
                raise NodeExecutionError(
                    node_id=node_id,
                    node_label=node.get("label", node_id),
                    message=f"Failed to execute composite node: {str(e)}",
                    cause=e
                )
        elif node_type == "for_loop":
            try:
                result = await self._execute_for_loop_node(node, pipeline_def, depth)
            except Exception as e:
                if isinstance(e, NodeExecutionError):
                    raise
                raise NodeExecutionError(
                    node_id=node_id,
                    node_label=node.get("label", node_id),
                    message=f"Failed to execute for loop node: {str(e)}",
                    cause=e
                )
        elif node_type == "while_loop":
            try:
                result = await self._execute_while_loop_node(node, pipeline_def, depth)
            except Exception as e:
                if isinstance(e, NodeExecutionError):
                    raise
                raise NodeExecutionError(
                    node_id=node_id,
                    node_label=node.get("label", node_id),
                    message=f"Failed to execute while loop node: {str(e)}",
                    cause=e
                )
        else:
            raise ValidationError(
                f"Unknown node type: {node_type}",
                field="type",
                details={"node_id": node_id, "node_type": node_type}
            )

        # Store results
        self.data_store[node_id] = result

        logger.debug(f"Node '{node_id}' completed. Outputs: {list(result.keys())}")

    async def _execute_composite_node(
        self,
        node: Dict[str, Any],
        pipeline_def: Dict[str, Any],
        depth: int = 0
    ) -> Dict[str, Any]:
        """
        Execute a composite node (subgraph).

        Args:
            node: Composite node definition
            pipeline_def: Parent pipeline definition
            depth: Current nesting depth

        Returns:
            Composite outputs
        """
        node_id = node["id"]
        composite_id = node.get("composite_id")

        # Check depth limit
        if depth >= MAX_COMPOSITE_DEPTH:
            raise NodeExecutionError(
                node_id=node_id,
                node_label=node.get("label", node_id),
                message=f"Maximum composite nesting depth ({MAX_COMPOSITE_DEPTH}) exceeded"
            )

        # Get composite definition
        composite_def = None

        # First, check if composite definition is embedded in the node
        if "subgraph" in node:
            composite_def = node
        elif self.composite_repository and composite_id:
            # Load from repository
            composite_def = await self.composite_repository.get(composite_id)
            if composite_def:
                composite_def = composite_def.to_dict()

        if not composite_def:
            raise NodeExecutionError(
                node_id=node_id,
                node_label=node.get("label", node_id),
                message=f"Composite definition not found for '{composite_id}'"
            )

        subgraph = composite_def.get("subgraph", {})
        input_mappings = composite_def.get("inputs", [])
        output_mappings = composite_def.get("outputs", [])

        if not subgraph:
            logger.warning(f"Composite '{node_id}' has empty subgraph")
            return {}

        # Collect inputs for this composite node
        external_inputs = await self._collect_inputs(node, pipeline_def)

        # Create a copy of the subgraph to avoid modifying the original
        subgraph_nodes = subgraph.get("nodes", [])
        subgraph_edges = subgraph.get("edges", [])

        # Build subgraph pipeline definition
        subgraph_pipeline = {
            "pipeline_id": f"{pipeline_def.get('pipeline_id', 'unknown')}.{node_id}",
            "name": f"Subgraph: {node.get('label', node_id)}",
            "nodes": subgraph_nodes,
            "edges": subgraph_edges,
        }

        # Save current data store and create isolated one for subgraph
        parent_data_store = self.data_store
        self.data_store = {}

        try:
            # Map external inputs to internal nodes
            for input_mapping in input_mappings:
                input_name = input_mapping.get("name")
                maps_to = input_mapping.get("maps_to", "")

                if "." not in maps_to:
                    continue

                target_node_id, target_pin = maps_to.split(".", 1)

                # If we have an external input for this, inject it
                if input_name in external_inputs:
                    # Pre-populate the data store with the input value
                    # We'll use a special prefix to indicate injected inputs
                    if target_node_id not in self.data_store:
                        self.data_store[f"__input__{target_node_id}"] = {}
                    self.data_store[f"__input__{target_node_id}"][target_pin] = external_inputs[input_name]

            # Build and execute subgraph
            graph = self._build_execution_graph(subgraph_pipeline)

            if not nx.is_directed_acyclic_graph(graph):
                cycles = list(nx.simple_cycles(graph))
                raise CircularDependencyError(
                    cycle=[str(n) for n in cycles[0]] if cycles else [],
                    details={"composite_id": composite_id}
                )

            execution_order = list(nx.topological_sort(graph))
            logger.debug(f"Composite '{node_id}' execution order: {execution_order}")

            # Execute subgraph nodes
            for sub_node_id in execution_order:
                await self._execute_node(sub_node_id, subgraph_pipeline, depth + 1)

            # Collect outputs
            outputs = {}
            for output_mapping in output_mappings:
                output_name = output_mapping.get("name")
                maps_from = output_mapping.get("maps_from", "")

                if "." not in maps_from:
                    continue

                source_node_id, source_pin = maps_from.split(".", 1)

                if source_node_id in self.data_store:
                    source_outputs = self.data_store[source_node_id]
                    if source_pin in source_outputs:
                        outputs[output_name] = source_outputs[source_pin]

            logger.debug(f"Composite '{node_id}' outputs: {list(outputs.keys())}")
            return outputs

        finally:
            # Restore parent data store
            self.data_store = parent_data_store

    async def _execute_for_loop_node(
        self,
        node: Dict[str, Any],
        pipeline_def: Dict[str, Any],
        depth: int = 0
    ) -> Dict[str, Any]:
        """
        Execute a For Loop node.

        For Loop executes connected loop_body nodes for a specified count.

        Inputs:
            - trigger: Starts the loop
            - count: Number of iterations (default: 1)

        Outputs:
            - loop_body: Trigger sent to body nodes each iteration
            - index: Current iteration index (0-based)
            - complete: Trigger when all iterations complete

        Args:
            node: For Loop node definition
            pipeline_def: Pipeline definition
            depth: Current nesting depth

        Returns:
            Loop outputs including completion status
        """
        node_id = node["id"]
        node_label = node.get("label", node_id)

        # Get loop configuration
        inputs = await self._collect_inputs(node, pipeline_def)
        count = inputs.get("count", node.get("config", {}).get("count", 1))

        # Ensure count is an integer
        try:
            count = int(count)
        except (TypeError, ValueError):
            count = 1

        # Limit iterations to prevent infinite loops
        max_iterations = 1000
        if count > max_iterations:
            logger.warning(f"For loop count {count} exceeds maximum {max_iterations}, limiting")
            count = max_iterations

        logger.info(f"Executing for loop '{node_label}' with {count} iterations")

        # Find nodes connected to loop_body output
        loop_body_nodes = []
        for edge in pipeline_def.get("edges", []):
            if edge["source"] == node_id and edge.get("source_handle") == "loop_body":
                loop_body_nodes.append(edge["target"])

        # Execute loop body for each iteration
        for i in range(count):
            logger.debug(f"For loop '{node_label}' iteration {i + 1}/{count}")

            # Set current index in data store for this node
            self.data_store[node_id] = {
                "loop_body": True,
                "index": i,
                "iteration": i + 1,
                "total": count,
            }

            # Publish iteration event
            await self._publish_event("NodeExecutingEvent", {
                "pipeline_id": pipeline_def.get("pipeline_id", "unknown"),
                "node_id": node_id,
                "label": node_label,
                "node_type": "for_loop",
                "function_id": None,
                "timestamp": datetime.now(),
                "iteration": i + 1,
                "total_iterations": count
            })

            # Execute each body node
            for body_node_id in loop_body_nodes:
                # Execute the body node and its downstream dependencies
                await self._execute_loop_body(body_node_id, pipeline_def, depth)

        # Return completion status
        return {
            "loop_body": False,  # Loop has ended
            "index": count - 1 if count > 0 else 0,
            "complete": True,
            "iterations_completed": count
        }

    async def _execute_while_loop_node(
        self,
        node: Dict[str, Any],
        pipeline_def: Dict[str, Any],
        depth: int = 0
    ) -> Dict[str, Any]:
        """
        Execute a While Loop node.

        While Loop executes connected loop_body nodes while condition is true.

        Inputs:
            - trigger: Starts the loop
            - condition: Boolean condition to check each iteration

        Outputs:
            - loop_body: Trigger sent to body nodes each iteration
            - index: Current iteration index (0-based)
            - complete: Trigger when loop exits

        Args:
            node: While Loop node definition
            pipeline_def: Pipeline definition
            depth: Current nesting depth

        Returns:
            Loop outputs including completion status
        """
        node_id = node["id"]
        node_label = node.get("label", node_id)

        # Get loop configuration
        max_iterations = node.get("config", {}).get("max_iterations", 1000)

        logger.info(f"Executing while loop '{node_label}' (max iterations: {max_iterations})")

        # Find nodes connected to loop_body output
        loop_body_nodes = []
        for edge in pipeline_def.get("edges", []):
            if edge["source"] == node_id and edge.get("source_handle") == "loop_body":
                loop_body_nodes.append(edge["target"])

        iteration = 0

        while iteration < max_iterations:
            # Re-collect inputs to get updated condition
            inputs = await self._collect_inputs(node, pipeline_def)
            condition = inputs.get("condition", True)

            # Convert to boolean
            if isinstance(condition, str):
                condition = condition.lower() not in ("false", "0", "no", "")
            else:
                condition = bool(condition)

            if not condition:
                logger.debug(f"While loop '{node_label}' condition false, exiting")
                break

            logger.debug(f"While loop '{node_label}' iteration {iteration + 1}")

            # Set current index in data store
            self.data_store[node_id] = {
                "loop_body": True,
                "index": iteration,
                "iteration": iteration + 1,
            }

            # Publish iteration event
            await self._publish_event("NodeExecutingEvent", {
                "pipeline_id": pipeline_def.get("pipeline_id", "unknown"),
                "node_id": node_id,
                "label": node_label,
                "node_type": "while_loop",
                "function_id": None,
                "timestamp": datetime.now(),
                "iteration": iteration + 1
            })

            # Execute each body node
            for body_node_id in loop_body_nodes:
                await self._execute_loop_body(body_node_id, pipeline_def, depth)

            iteration += 1

        if iteration >= max_iterations:
            logger.warning(f"While loop '{node_label}' reached max iterations ({max_iterations})")

        return {
            "loop_body": False,
            "index": max(0, iteration - 1),
            "complete": True,
            "iterations_completed": iteration
        }

    async def _execute_loop_body(
        self,
        start_node_id: str,
        pipeline_def: Dict[str, Any],
        depth: int
    ):
        """
        Execute a chain of nodes starting from start_node_id.

        This method executes the node and follows its output edges
        to execute dependent nodes, but only within the loop body scope.

        Args:
            start_node_id: Starting node ID
            pipeline_def: Pipeline definition
            depth: Current nesting depth
        """
        # Build a subgraph of nodes reachable from start_node_id
        # but stop at nodes that aren't exclusively fed by loop body
        visited = set()
        to_execute = [start_node_id]

        while to_execute:
            current_id = to_execute.pop(0)
            if current_id in visited:
                continue
            visited.add(current_id)

            # Execute this node
            await self._execute_node(current_id, pipeline_def, depth + 1)

            # Find downstream nodes connected to this node's outputs
            for edge in pipeline_def.get("edges", []):
                if edge["source"] == current_id:
                    target_id = edge["target"]
                    target_node = self._find_node(target_id, pipeline_def)

                    # Don't follow edges to other control flow nodes
                    if target_node:
                        target_type = target_node.get("type")
                        if target_type in ("for_loop", "while_loop"):
                            continue

                    if target_id not in visited:
                        to_execute.append(target_id)

    async def _execute_function_node(
        self,
        node: Dict[str, Any],
        pipeline_def: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a function node.

        Args:
            node: Node definition
            pipeline_def: Pipeline definition

        Returns:
            Function outputs
        """
        node_id = node["id"]
        instance_id = node.get("device_instance", "")
        function_id = node.get("function_id", "")
        plugin_id = node.get("plugin_id", "")

        logger.info(f"Executing function node: id={node_id}, plugin_id={plugin_id}, function_id={function_id}, instance_id={instance_id}")

        # Collect inputs from connected edges and node config
        inputs = await self._collect_inputs(node, pipeline_def)
        logger.info(f"Node {node_id} inputs: {inputs}")

        # Handle logic plugin functions directly (no device instance needed)
        if plugin_id == "logic":
            return await self._execute_logic_function(function_id, inputs)

        # If no instance_id, try to execute plugin function directly (stateless)
        if not instance_id:
            return await self._execute_plugin_function_direct(plugin_id, function_id, inputs)

        # Execute function via device manager
        try:
            outputs = await self.device_manager.execute_function(
                instance_id=instance_id,
                function_id=function_id,
                inputs=inputs
            )
            return outputs

        except Exception as e:
            logger.error(f"Error executing function '{function_id}' on node '{node_id}': {e}")
            raise

    async def _execute_plugin_function_direct(
        self,
        plugin_id: str,
        function_id: str,
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute plugin function directly without device instance.

        This is useful for stateless operations or when testing.
        Creates a temporary device instance, executes the function, and discards it.

        Args:
            plugin_id: Plugin identifier
            function_id: Function identifier
            inputs: Function inputs

        Returns:
            Function outputs
        """
        logger.info(f"Executing plugin function directly: {plugin_id}.{function_id}")

        try:
            # Load plugin if not already loaded
            loaded_plugin = self.plugin_loader.get_loaded_plugin(plugin_id)
            if not loaded_plugin:
                loaded_plugin = await self.plugin_loader.load_plugin(plugin_id)

            # Get function class
            function_classes = loaded_plugin.get("function_classes", {})
            if function_id not in function_classes:
                logger.warning(f"Function '{function_id}' not found in plugin '{plugin_id}'")
                return {"complete": True}

            function_class = function_classes[function_id]

            # Create temporary device instance for execution
            device_class = loaded_plugin.get("device_class")
            if device_class:
                # Create a temporary device with minimal config
                temp_device = device_class(config={})

                # Create function instance
                function_instance = function_class(device=temp_device)

                # Execute function
                outputs = await function_instance.execute(inputs)

                # Collect and publish logs
                await self._publish_function_logs(function_instance, plugin_id, function_id)

                return outputs
            else:
                # No device class, try to execute function statically
                function_instance = function_class(device=None)
                outputs = await function_instance.execute(inputs)

                # Collect and publish logs
                await self._publish_function_logs(function_instance, plugin_id, function_id)

                return outputs

        except Exception as e:
            logger.error(f"Error executing plugin function directly: {e}")
            return {"complete": True, "error": str(e)}

    async def _publish_function_logs(
        self,
        function_instance,
        plugin_id: str,
        function_id: str
    ):
        """Publish any log messages from function execution."""
        if not hasattr(function_instance, 'get_logs'):
            return

        logs = function_instance.get_logs()
        for log_entry in logs:
            await self._publish_event("NodeLogEvent", {
                "pipeline_id": "direct_execution",
                "node_id": f"{plugin_id}.{function_id}",
                "label": f"{plugin_id}.{function_id}",
                "timestamp": datetime.now(),
                "message": log_entry.get("message", ""),
                "level": log_entry.get("level", "info")
            })

    async def _execute_logic_function(
        self,
        function_id: str,
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute logic plugin functions directly without device instance.

        Args:
            function_id: Function identifier (delay, branch, print, etc.)
            inputs: Function inputs

        Returns:
            Function outputs
        """
        import asyncio

        if function_id == "delay":
            # Get duration from config (in milliseconds)
            duration_ms = inputs.get('duration_ms', 1000)
            duration_sec = duration_ms / 1000.0
            logger.info(f"Delay: waiting {duration_ms}ms")
            await asyncio.sleep(duration_sec)
            logger.info(f"Delay: complete")
            return {'complete': True}

        elif function_id == "branch":
            condition = inputs.get('condition', False)
            logger.info(f"Branch: condition is {condition}")
            if condition:
                return {'true': True, 'false': False}
            else:
                return {'true': False, 'false': True}

        elif function_id == "print":
            message = inputs.get('message', '')
            print(f"[Pipeline Print] {message}")
            logger.info(f"Print: {message}")
            return {'complete': True}

        elif function_id == "set_variable":
            value = inputs.get('value', None)
            logger.info(f"SetVariable: value = {value}")
            return {'complete': True, 'value': value}

        else:
            # Unknown logic function - return trigger complete
            logger.warning(f"Unknown logic function: {function_id}")
            return {'complete': True}

    async def _collect_inputs(
        self,
        node: Dict[str, Any],
        pipeline_def: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Collect inputs for a node from edges and config.

        Args:
            node: Node definition
            pipeline_def: Pipeline definition

        Returns:
            Collected inputs dictionary
        """
        inputs = {}
        node_id = node["id"]

        # Start with node config (default values)
        node_config = node.get("config", {})
        inputs.update(node_config)

        # Check for injected inputs from composite node execution
        # These are stored with __input__ prefix during subgraph execution
        injected_key = f"__input__{node_id}"
        if injected_key in self.data_store:
            injected_inputs = self.data_store[injected_key]
            inputs.update(injected_inputs)
            logger.debug(f"Injected inputs for '{node_id}': {list(injected_inputs.keys())}")

        # Collect from connected edges
        for edge in pipeline_def.get("edges", []):
            if edge["target"] == node_id:
                source_node_id = edge["source"]
                source_handle = edge["source_handle"]
                target_handle = edge["target_handle"]

                # Get data from source node
                if source_node_id in self.data_store:
                    source_outputs = self.data_store[source_node_id]

                    if source_handle in source_outputs:
                        value = source_outputs[source_handle]
                        inputs[target_handle] = value
                        logger.debug(
                            f"Input '{target_handle}' = {value} "
                            f"(from {source_node_id}.{source_handle})"
                        )
                    else:
                        logger.warning(
                            f"Source output '{source_handle}' not found "
                            f"in node '{source_node_id}'"
                        )
                else:
                    logger.warning(f"Source node '{source_node_id}' has no output data")

        return inputs

    def _find_node(self, node_id: str, pipeline_def: Dict[str, Any]) -> Dict[str, Any]:
        """
        Find a node by ID in pipeline definition.

        Args:
            node_id: Node identifier
            pipeline_def: Pipeline definition

        Returns:
            Node definition or None if not found
        """
        for node in pipeline_def.get("nodes", []):
            if node["id"] == node_id:
                return node
        return None

    def get_execution_results(self) -> Dict[str, Dict[str, Any]]:
        """
        Get execution results (data store).

        Returns:
            Data store containing all node outputs
        """
        return self.data_store.copy()

    def clear_execution_results(self):
        """Clear execution results."""
        self.data_store = {}
        logger.debug("Execution results cleared")

    def _group_by_execution_level(
        self,
        graph: nx.DiGraph,
        execution_order: List[str]
    ) -> List[List[str]]:
        """
        Group nodes by execution level for parallel execution.

        Nodes in the same level have no dependencies on each other
        and can be executed in parallel.

        Args:
            graph: Directed execution graph
            execution_order: Topologically sorted node list

        Returns:
            List of node groups, where each group can run in parallel
        """
        levels = []
        remaining = set(execution_order)
        executed = set()

        while remaining:
            # Find nodes whose dependencies are all executed
            current_level = [
                node for node in remaining
                if all(pred in executed for pred in graph.predecessors(node))
            ]

            if not current_level:
                # Safety: if no nodes can be executed, take first remaining
                current_level = [next(iter(remaining))]

            levels.append(current_level)
            executed.update(current_level)
            remaining -= set(current_level)

        logger.info(f"Grouped into {len(levels)} execution levels: {[len(l) for l in levels]} nodes per level")
        return levels

    async def _publish_event(self, event_type: str, event_data: Dict[str, Any]):
        """
        Publish an event to the event bus.

        Args:
            event_type: Type of event to publish
            event_data: Event data dictionary
        """
        if self.event_bus is None:
            logger.debug(f"Event bus not available, skipping event: {event_type}")
            return

        try:
            # Dynamically import event classes
            from domain.events import (
                PipelineStartedEvent,
                NodeExecutingEvent,
                NodeCompletedEvent,
                NodeLogEvent,
                PipelineCompletedEvent,
                PipelineErrorEvent
            )

            event_classes = {
                "PipelineStartedEvent": PipelineStartedEvent,
                "NodeExecutingEvent": NodeExecutingEvent,
                "NodeCompletedEvent": NodeCompletedEvent,
                "NodeLogEvent": NodeLogEvent,
                "PipelineCompletedEvent": PipelineCompletedEvent,
                "PipelineErrorEvent": PipelineErrorEvent
            }

            if event_type in event_classes:
                event_class = event_classes[event_type]
                event = event_class(**event_data)
                await self.event_bus.publish(event)
                logger.debug(f"Published event: {event_type}")
            else:
                logger.warning(f"Unknown event type: {event_type}")

        except Exception as e:
            logger.error(f"Error publishing event {event_type}: {e}")
