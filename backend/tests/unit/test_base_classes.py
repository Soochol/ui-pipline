"""Unit tests for base device and function classes."""

import pytest
from typing import Any, Dict
from core.base_device import BaseDevice, DeviceStatus
from core.base_function import BaseFunction


# Mock implementations for testing
class MockDevice(BaseDevice):
    """Mock device for testing."""

    async def connect(self) -> bool:
        """Mock connect."""
        self.status = DeviceStatus.CONNECTED
        return True

    async def disconnect(self) -> bool:
        """Mock disconnect."""
        self.status = DeviceStatus.DISCONNECTED
        return True

    async def health_check(self) -> bool:
        """Mock health check."""
        return self.status == DeviceStatus.CONNECTED

    def get_info(self) -> Dict[str, Any]:
        """Get device info."""
        return {
            "id": self.instance_id,
            "type": "mock_device",
            "status": self.get_status(),
            "config": self.config
        }


class MockFunction(BaseFunction):
    """Mock function for testing."""

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Mock execute."""
        return {"result": "success", "value": inputs.get("value", 0)}


# Tests for DeviceStatus
def test_device_status_enum():
    """Test DeviceStatus enum values."""
    assert DeviceStatus.DISCONNECTED.value == "disconnected"
    assert DeviceStatus.CONNECTING.value == "connecting"
    assert DeviceStatus.CONNECTED.value == "connected"
    assert DeviceStatus.ERROR.value == "error"


# Tests for BaseDevice
def test_device_initialization():
    """Test device initialization."""
    device = MockDevice("test_device", {"port": "COM1", "baudrate": 9600})

    assert device.instance_id == "test_device"
    assert device.config == {"port": "COM1", "baudrate": 9600}
    assert device.status == DeviceStatus.DISCONNECTED
    assert device.error_message is None


@pytest.mark.asyncio
async def test_device_connect():
    """Test device connection."""
    device = MockDevice("test_device", {})

    result = await device.connect()

    assert result is True
    assert device.status == DeviceStatus.CONNECTED
    assert device.is_connected() is True


@pytest.mark.asyncio
async def test_device_disconnect():
    """Test device disconnection."""
    device = MockDevice("test_device", {})

    await device.connect()
    assert device.is_connected() is True

    result = await device.disconnect()

    assert result is True
    assert device.status == DeviceStatus.DISCONNECTED
    assert device.is_connected() is False


@pytest.mark.asyncio
async def test_device_health_check():
    """Test device health check."""
    device = MockDevice("test_device", {})

    # Disconnected device should fail health check
    healthy = await device.health_check()
    assert healthy is False

    # Connected device should pass health check
    await device.connect()
    healthy = await device.health_check()
    assert healthy is True


def test_device_error_handling():
    """Test device error state management."""
    device = MockDevice("test_device", {})

    # Set error
    device.set_error("Connection timeout")

    assert device.status == DeviceStatus.ERROR
    assert device.error_message == "Connection timeout"
    assert device.get_error() == "Connection timeout"
    assert device.is_connected() is False

    # Clear error
    device.clear_error()

    assert device.status == DeviceStatus.DISCONNECTED
    assert device.error_message is None
    assert device.get_error() is None


def test_device_get_info():
    """Test device get_info method."""
    device = MockDevice("test_device", {"port": "COM1"})

    info = device.get_info()

    assert info["id"] == "test_device"
    assert info["type"] == "mock_device"
    assert info["status"] == "disconnected"
    assert info["config"]["port"] == "COM1"


# Tests for BaseFunction
def test_function_initialization():
    """Test function initialization."""
    device = MockDevice("test_device", {})
    func = MockFunction(device)

    assert func.device_instance == device
    assert func.get_device() == device


@pytest.mark.asyncio
async def test_function_execute():
    """Test function execution."""
    device = MockDevice("test_device", {})
    func = MockFunction(device)

    result = await func.execute({"value": 42})

    assert result["result"] == "success"
    assert result["value"] == 42


def test_function_validate_inputs_required():
    """Test input validation with required fields."""
    device = MockDevice("test_device", {})
    func = MockFunction(device)

    schema = {
        "position": {"type": "number", "required": True},
        "speed": {"type": "number", "required": False, "default": 100.0}
    }

    # Missing required input
    inputs = {}
    with pytest.raises(ValueError, match="Required input 'position' is missing"):
        func.validate_inputs(inputs, schema)

    # Valid inputs
    inputs = {"position": 50.0}
    assert func.validate_inputs(inputs, schema) is True
    assert inputs["speed"] == 100.0  # Default applied


def test_function_validate_inputs_types():
    """Test input type validation."""
    device = MockDevice("test_device", {})
    func = MockFunction(device)

    schema = {
        "position": {"type": "number", "required": True},
        "name": {"type": "string", "required": True},
        "enabled": {"type": "boolean", "required": True}
    }

    # Valid types
    inputs = {"position": 42, "name": "test", "enabled": True}
    assert func.validate_inputs(inputs, schema) is True

    # Invalid type for position (string instead of number)
    inputs = {"position": "invalid", "name": "test", "enabled": True}
    with pytest.raises(ValueError, match="Input 'position' has invalid type"):
        func.validate_inputs(inputs, schema)

    # Invalid type for name (number instead of string)
    inputs = {"position": 42, "name": 123, "enabled": True}
    with pytest.raises(ValueError, match="Input 'name' has invalid type"):
        func.validate_inputs(inputs, schema)


def test_function_validate_inputs_default_values():
    """Test default value application."""
    device = MockDevice("test_device", {})
    func = MockFunction(device)

    schema = {
        "speed": {"type": "number", "required": False, "default": 100.0},
        "timeout": {"type": "number", "required": False, "default": 5.0}
    }

    inputs = {}
    func.validate_inputs(inputs, schema)

    assert inputs["speed"] == 100.0
    assert inputs["timeout"] == 5.0


def test_function_validate_type_all_types():
    """Test type validation for all supported types."""
    device = MockDevice("test_device", {})
    func = MockFunction(device)

    # Number (int and float)
    assert func._validate_type(42, "number") is True
    assert func._validate_type(3.14, "number") is True
    assert func._validate_type("42", "number") is False

    # String
    assert func._validate_type("hello", "string") is True
    assert func._validate_type(42, "string") is False

    # Boolean
    assert func._validate_type(True, "boolean") is True
    assert func._validate_type(False, "boolean") is True
    assert func._validate_type(1, "boolean") is False

    # Array
    assert func._validate_type([1, 2, 3], "array") is True
    assert func._validate_type((1, 2, 3), "array") is True
    assert func._validate_type("not array", "array") is False

    # Object
    assert func._validate_type({"key": "value"}, "object") is True
    assert func._validate_type([1, 2], "object") is False

    # Any (accepts everything)
    assert func._validate_type(42, "any") is True
    assert func._validate_type("string", "any") is True
    assert func._validate_type(None, "any") is True


def test_function_get_function_info():
    """Test get_function_info method."""
    device = MockDevice("test_device", {})
    func = MockFunction(device)

    info = func.get_function_info()

    assert info["class"] == "MockFunction"
    assert info["device_id"] == "test_device"
    assert info["device_status"] == "disconnected"
