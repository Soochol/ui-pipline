"""Device-related use cases."""

from typing import Dict, Any, List
import time


class ListDevicesUseCase:
    """Use case for listing device instances."""

    def __init__(self, device_manager):
        self.device_manager = device_manager

    async def execute(self) -> List[Dict[str, Any]]:
        """List all device instances."""
        if self.device_manager is None:
            return []
        return self.device_manager.list_device_instances()


class CreateDeviceUseCase:
    """Use case for creating a device instance."""

    def __init__(self, device_manager):
        self.device_manager = device_manager

    async def execute(
        self, plugin_id: str, instance_id: str, config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a new device instance.

        Args:
            plugin_id: Plugin identifier
            instance_id: Instance identifier
            config: Device configuration

        Returns:
            Device information dictionary

        Raises:
            ValueError: If device creation fails
        """
        if self.device_manager is None:
            raise ValueError("Device manager not initialized")

        instance_id = await self.device_manager.create_device_instance(
            plugin_id=plugin_id, instance_id=instance_id, config=config
        )

        device = self.device_manager.get_device_instance(instance_id)
        device_info = device.get_info()

        return {
            "instance_id": device_info["id"],
            "plugin_id": plugin_id,
            "status": device_info["status"],
            "config": device_info["config"],
            "error": device.get_error(),
        }


class DeleteDeviceUseCase:
    """Use case for deleting a device instance."""

    def __init__(self, device_manager):
        self.device_manager = device_manager

    async def execute(self, instance_id: str) -> Dict[str, Any]:
        """
        Delete a device instance.

        Args:
            instance_id: Instance identifier

        Returns:
            Success status and message

        Raises:
            ValueError: If device not found
        """
        if self.device_manager is None:
            raise ValueError("Device manager not initialized")

        success = await self.device_manager.remove_device_instance(instance_id)

        if not success:
            raise ValueError(f"Device '{instance_id}' not found")

        return {
            "success": True,
            "instance_id": instance_id,
            "message": f"Device '{instance_id}' deleted successfully",
        }


class ExecuteFunctionUseCase:
    """Use case for executing a device function."""

    def __init__(self, device_manager):
        self.device_manager = device_manager

    async def execute(
        self, instance_id: str, function_id: str, inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a device function.

        Args:
            instance_id: Device instance identifier
            function_id: Function identifier
            inputs: Function inputs

        Returns:
            Execution result with outputs and timing

        Raises:
            ValueError: If device or function not found
        """
        if self.device_manager is None:
            raise ValueError("Device manager not initialized")

        start_time = time.time()

        try:
            outputs = await self.device_manager.execute_function(
                instance_id=instance_id, function_id=function_id, inputs=inputs
            )

            execution_time = time.time() - start_time

            return {
                "success": True,
                "instance_id": instance_id,
                "function_id": function_id,
                "outputs": outputs,
                "execution_time": execution_time,
                "error": None,
            }
        except Exception as e:
            execution_time = time.time() - start_time
            return {
                "success": False,
                "instance_id": instance_id,
                "function_id": function_id,
                "outputs": None,
                "execution_time": execution_time,
                "error": str(e),
            }
