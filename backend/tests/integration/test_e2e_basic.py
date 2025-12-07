"""End-to-end integration tests."""

import pytest
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.plugin_loader import PluginLoader
from core.device_manager import DeviceManager
from core.execution_engine import ExecutionEngine


@pytest.mark.asyncio
async def test_plugin_discovery():
    """Test plugin discovery."""
    plugin_loader = PluginLoader("plugins")
    plugins = await plugin_loader.discover_plugins()

    assert len(plugins) > 0
    assert any(p["id"] == "mock_servo" for p in plugins)


@pytest.mark.asyncio
async def test_plugin_loading():
    """Test plugin loading."""
    plugin_loader = PluginLoader("plugins")
    await plugin_loader.discover_plugins()

    plugin_data = await plugin_loader.load_plugin("mock_servo")

    assert "device_class" in plugin_data
    assert "function_classes" in plugin_data
    assert len(plugin_data["function_classes"]) == 3  # home, move, get_position


@pytest.mark.asyncio
async def test_device_instance_creation():
    """Test device instance creation."""
    plugin_loader = PluginLoader("plugins")
    await plugin_loader.discover_plugins()

    device_manager = DeviceManager(plugin_loader)

    instance_id = await device_manager.create_device_instance(
        plugin_id="mock_servo",
        instance_id="test_servo_1",
        config={"axis": 0, "max_position": 1000.0}
    )

    assert instance_id == "test_servo_1"

    device = device_manager.get_device_instance("test_servo_1")
    assert device is not None
    assert device.instance_id == "test_servo_1"


@pytest.mark.asyncio
async def test_function_execution():
    """Test function execution on device instance."""
    plugin_loader = PluginLoader("plugins")
    await plugin_loader.discover_plugins()

    device_manager = DeviceManager(plugin_loader)

    # Create device instance
    await device_manager.create_device_instance(
        plugin_id="mock_servo",
        instance_id="test_servo_2",
        config={"axis": 0, "auto_connect": True}
    )

    # Execute home function
    result = await device_manager.execute_function(
        instance_id="test_servo_2",
        function_id="home",
        inputs={"trigger": True}
    )

    assert "complete" in result
    assert result["complete"] is True
    assert "position" in result
    assert result["position"] == 0.0

    # Execute move function
    result = await device_manager.execute_function(
        instance_id="test_servo_2",
        function_id="move",
        inputs={"trigger": True, "position": 500.0, "speed": 100.0}
    )

    assert result["complete"] is True
    assert result["position"] == 500.0


@pytest.mark.asyncio
async def test_pipeline_execution():
    """Test complete pipeline execution."""
    plugin_loader = PluginLoader("plugins")
    await plugin_loader.discover_plugins()

    device_manager = DeviceManager(plugin_loader)
    execution_engine = ExecutionEngine(device_manager, plugin_loader)

    # Create device instance
    await device_manager.create_device_instance(
        plugin_id="mock_servo",
        instance_id="pipeline_servo",
        config={"axis": 0, "auto_connect": True}
    )

    # Define simple 3-node pipeline: Home -> Move -> Get Position
    pipeline_def = {
        "pipeline_id": "test_pipeline_1",
        "name": "Test Pipeline",
        "nodes": [
            {
                "id": "node_home",
                "type": "function",
                "plugin_id": "mock_servo",
                "device_instance": "pipeline_servo",
                "function_id": "home",
                "config": {}
            },
            {
                "id": "node_move",
                "type": "function",
                "plugin_id": "mock_servo",
                "device_instance": "pipeline_servo",
                "function_id": "move",
                "config": {"speed": 100.0}
            },
            {
                "id": "node_get_pos",
                "type": "function",
                "plugin_id": "mock_servo",
                "device_instance": "pipeline_servo",
                "function_id": "get_position",
                "config": {}
            }
        ],
        "edges": [
            {
                "id": "edge_1",
                "source": "node_home",
                "source_handle": "complete",
                "target": "node_move",
                "target_handle": "trigger"
            },
            {
                "id": "edge_2",
                "source": "node_home",
                "source_handle": "position",
                "target": "node_move",
                "target_handle": "position"
            },
            {
                "id": "edge_3",
                "source": "node_move",
                "source_handle": "complete",
                "target": "node_get_pos",
                "target_handle": "trigger"
            }
        ],
        "variables": {}
    }

    # Execute pipeline
    result = await execution_engine.execute_pipeline(pipeline_def)

    assert result["success"] is True
    assert result["nodes_executed"] == 3
    assert "results" in result

    # Verify node outputs
    assert "node_home" in result["results"]
    assert "node_move" in result["results"]
    assert "node_get_pos" in result["results"]

    # Check final position
    final_pos = result["results"]["node_get_pos"]["position"]
    assert final_pos == 0.0  # Moved to home position (0)


@pytest.mark.asyncio
async def test_circular_dependency_detection():
    """Test that circular dependencies are detected."""
    plugin_loader = PluginLoader("plugins")
    await plugin_loader.discover_plugins()

    device_manager = DeviceManager(plugin_loader)
    execution_engine = ExecutionEngine(device_manager, plugin_loader)

    # Create device
    await device_manager.create_device_instance(
        plugin_id="mock_servo",
        instance_id="circular_servo",
        config={"auto_connect": True}
    )

    # Define pipeline with circular dependency: A -> B -> A
    pipeline_def = {
        "pipeline_id": "circular_pipeline",
        "name": "Circular Pipeline",
        "nodes": [
            {
                "id": "node_a",
                "type": "function",
                "plugin_id": "mock_servo",
                "device_instance": "circular_servo",
                "function_id": "home",
                "config": {}
            },
            {
                "id": "node_b",
                "type": "function",
                "plugin_id": "mock_servo",
                "device_instance": "circular_servo",
                "function_id": "move",
                "config": {"position": 100.0, "speed": 100.0}
            }
        ],
        "edges": [
            {
                "id": "edge_1",
                "source": "node_a",
                "source_handle": "complete",
                "target": "node_b",
                "target_handle": "trigger"
            },
            {
                "id": "edge_2",
                "source": "node_b",
                "source_handle": "complete",
                "target": "node_a",
                "target_handle": "trigger"
            }
        ],
        "variables": {}
    }

    # Execute should fail with circular dependency error
    result = await execution_engine.execute_pipeline(pipeline_def)

    assert result["success"] is False
    assert "circular" in result["error"].lower()
