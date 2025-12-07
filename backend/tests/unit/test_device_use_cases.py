"""Unit tests for device use cases."""

import pytest
from unittest.mock import Mock, AsyncMock
from domain.use_cases.device_use_cases import (
    ListDevicesUseCase,
    CreateDeviceUseCase,
    DeleteDeviceUseCase,
    ExecuteFunctionUseCase,
)


@pytest.mark.asyncio
async def test_list_devices_use_case():
    """Test listing devices."""
    # Arrange
    mock_device_manager = Mock()
    mock_device_manager.list_device_instances.return_value = [
        {"id": "device1", "status": "connected"},
        {"id": "device2", "status": "connected"},
    ]
    use_case = ListDevicesUseCase(mock_device_manager)

    # Act
    result = await use_case.execute()

    # Assert
    assert len(result) == 2
    assert result[0]["id"] == "device1"
    mock_device_manager.list_device_instances.assert_called_once()


@pytest.mark.asyncio
async def test_list_devices_use_case_no_manager():
    """Test listing devices when manager is None."""
    # Arrange
    use_case = ListDevicesUseCase(None)

    # Act
    result = await use_case.execute()

    # Assert
    assert result == []


@pytest.mark.asyncio
async def test_create_device_use_case():
    """Test creating a device."""
    # Arrange
    mock_device_manager = Mock()
    mock_device_manager.create_device_instance = AsyncMock(return_value="device1")
    
    mock_device = Mock()
    mock_device.get_info.return_value = {
        "id": "device1",
        "status": "connected",
        "config": {"param": "value"},
    }
    mock_device.get_error.return_value = None
    mock_device_manager.get_device_instance.return_value = mock_device
    
    use_case = CreateDeviceUseCase(mock_device_manager)

    # Act
    result = await use_case.execute(
        plugin_id="plugin1",
        instance_id="device1",
        config={"param": "value"},
    )

    # Assert
    assert result["instance_id"] == "device1"
    assert result["plugin_id"] == "plugin1"
    assert result["status"] == "connected"
    mock_device_manager.create_device_instance.assert_called_once()


@pytest.mark.asyncio
async def test_create_device_use_case_no_manager():
    """Test creating device when manager is None."""
    # Arrange
    use_case = CreateDeviceUseCase(None)

    # Act & Assert
    with pytest.raises(ValueError, match="Device manager not initialized"):
        await use_case.execute("plugin1", "device1", {})


@pytest.mark.asyncio
async def test_delete_device_use_case():
    """Test deleting a device."""
    # Arrange
    mock_device_manager = Mock()
    mock_device_manager.remove_device_instance = AsyncMock(return_value=True)
    use_case = DeleteDeviceUseCase(mock_device_manager)

    # Act
    result = await use_case.execute("device1")

    # Assert
    assert result["success"] is True
    assert result["instance_id"] == "device1"
    mock_device_manager.remove_device_instance.assert_called_once_with("device1")


@pytest.mark.asyncio
async def test_delete_device_use_case_not_found():
    """Test deleting a non-existent device."""
    # Arrange
    mock_device_manager = Mock()
    mock_device_manager.remove_device_instance = AsyncMock(return_value=False)
    use_case = DeleteDeviceUseCase(mock_device_manager)

    # Act & Assert
    with pytest.raises(ValueError, match="Device 'device1' not found"):
        await use_case.execute("device1")


@pytest.mark.asyncio
async def test_execute_function_use_case_success():
    """Test executing a device function successfully."""
    # Arrange
    mock_device_manager = Mock()
    mock_device_manager.execute_function = AsyncMock(return_value={"result": "success"})
    use_case = ExecuteFunctionUseCase(mock_device_manager)

    # Act
    result = await use_case.execute("device1", "function1", {"input": "value"})

    # Assert
    assert result["success"] is True
    assert result["outputs"] == {"result": "success"}
    assert "execution_time" in result
    assert result["error"] is None


@pytest.mark.asyncio
async def test_execute_function_use_case_error():
    """Test executing a device function with error."""
    # Arrange
    mock_device_manager = Mock()
    mock_device_manager.execute_function = AsyncMock(side_effect=Exception("Execution failed"))
    use_case = ExecuteFunctionUseCase(mock_device_manager)

    # Act
    result = await use_case.execute("device1", "function1", {"input": "value"})

    # Assert
    assert result["success"] is False
    assert result["outputs"] is None
    assert "Execution failed" in result["error"]
    assert "execution_time" in result
