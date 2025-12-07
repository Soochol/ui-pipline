"""Device manager for managing device instances."""

import logging
from typing import Any, Dict, List, Optional
from .base_device import BaseDevice
from .plugin_loader import PluginLoader
from domain.exceptions import (
    DeviceNotFoundError,
    DeviceConnectionError,
    DeviceFunctionError,
    AlreadyExistsError,
    PluginNotFoundError,
)

logger = logging.getLogger(__name__)


class DeviceManager:
    """
    Manages device instances.

    Handles creation, removal, and lifecycle of device instances.
    Each instance is created from a plugin and has a unique ID.
    """

    def __init__(self, plugin_loader: PluginLoader):
        """
        Initialize device manager.

        Args:
            plugin_loader: Plugin loader instance
        """
        self.plugin_loader = plugin_loader
        self.device_instances: Dict[str, BaseDevice] = {}
        self.instance_plugins: Dict[str, str] = {}  # instance_id -> plugin_id
        self.function_classes: Dict[str, Dict[str, Any]] = {}  # instance_id -> {func_id: func_class}

        logger.info("DeviceManager initialized")

    async def create_device_instance(
        self,
        plugin_id: str,
        instance_id: str,
        config: Dict[str, Any]
    ) -> str:
        """
        Create a new device instance.

        Args:
            plugin_id: Plugin identifier
            instance_id: Unique instance identifier
            config: Device configuration

        Returns:
            Instance ID

        Raises:
            ValueError: If instance already exists or plugin not found
        """
        # Check if instance already exists
        if instance_id in self.device_instances:
            raise AlreadyExistsError(
                resource_type="Device instance",
                resource_id=instance_id
            )

        # Load plugin if not already loaded
        plugin_data = self.plugin_loader.get_loaded_plugin(plugin_id)
        if plugin_data is None:
            logger.info(f"Loading plugin '{plugin_id}' for instance '{instance_id}'")
            plugin_data = await self.plugin_loader.load_plugin(plugin_id)

        # Create device instance
        device_class = plugin_data["device_class"]
        device_instance = device_class(instance_id, config)

        # Store instance
        self.device_instances[instance_id] = device_instance
        self.instance_plugins[instance_id] = plugin_id
        self.function_classes[instance_id] = plugin_data["function_classes"]

        logger.info(f"Created device instance '{instance_id}' from plugin '{plugin_id}'")

        # Auto-connect if requested
        if config.get("auto_connect", False):
            await device_instance.connect()

        return instance_id

    async def remove_device_instance(self, instance_id: str) -> bool:
        """
        Remove a device instance.

        Args:
            instance_id: Instance identifier

        Returns:
            True if removed successfully

        Raises:
            ValueError: If instance not found
        """
        if instance_id not in self.device_instances:
            raise DeviceNotFoundError(instance_id=instance_id)

        device = self.device_instances[instance_id]

        # Disconnect if connected
        if device.is_connected():
            await device.disconnect()

        # Remove from storage
        del self.device_instances[instance_id]
        del self.instance_plugins[instance_id]
        del self.function_classes[instance_id]

        logger.info(f"Removed device instance '{instance_id}'")
        return True

    def get_device_instance(self, instance_id: str) -> BaseDevice:
        """
        Get a device instance.

        Args:
            instance_id: Instance identifier

        Returns:
            Device instance

        Raises:
            ValueError: If instance not found
        """
        if instance_id not in self.device_instances:
            raise DeviceNotFoundError(instance_id=instance_id)

        return self.device_instances[instance_id]

    def list_device_instances(self) -> List[Dict[str, Any]]:
        """
        List all device instances.

        Returns:
            List of device information dictionaries
        """
        instances = []

        for instance_id, device in self.device_instances.items():
            device_info = device.get_info()
            instances.append({
                "instance_id": instance_id,
                "plugin_id": self.instance_plugins[instance_id],
                "status": device.get_status(),
                "config": device_info.get("config", {}),
                "error": device.get_error()
            })

        return instances

    async def execute_function(
        self,
        instance_id: str,
        function_id: str,
        inputs: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute a function on a device instance.

        Args:
            instance_id: Device instance identifier
            function_id: Function identifier
            inputs: Function inputs

        Returns:
            Function outputs

        Raises:
            ValueError: If instance or function not found
        """
        # Get device instance
        if instance_id not in self.device_instances:
            raise DeviceNotFoundError(instance_id=instance_id)

        device = self.device_instances[instance_id]

        # Get function class
        if instance_id not in self.function_classes:
            raise DeviceFunctionError(
                instance_id=instance_id,
                function_id=function_id,
                message=f"No functions available for instance '{instance_id}'"
            )

        function_classes = self.function_classes[instance_id]
        if function_id not in function_classes:
            raise DeviceFunctionError(
                instance_id=instance_id,
                function_id=function_id,
                message=f"Function '{function_id}' not found",
                details={"available_functions": list(function_classes.keys())}
            )

        # Create function instance
        function_class = function_classes[function_id]
        function_instance = function_class(device)

        # Execute function
        logger.debug(f"Executing function '{function_id}' on instance '{instance_id}'")
        try:
            outputs = await function_instance.execute(inputs)
            return outputs
        except Exception as e:
            raise DeviceFunctionError(
                instance_id=instance_id,
                function_id=function_id,
                message=f"Function execution failed: {str(e)}",
                cause=e
            )

    async def connect_all_devices(self) -> Dict[str, bool]:
        """
        Connect all device instances.

        Returns:
            Dictionary mapping instance_id to connection success
        """
        results = {}

        for instance_id, device in self.device_instances.items():
            try:
                success = await device.connect()
                results[instance_id] = success
                logger.info(f"Connected device '{instance_id}': {success}")
            except Exception as e:
                logger.error(f"Error connecting device '{instance_id}': {e}")
                results[instance_id] = False

        return results

    async def disconnect_all_devices(self) -> Dict[str, bool]:
        """
        Disconnect all device instances.

        Returns:
            Dictionary mapping instance_id to disconnection success
        """
        results = {}

        for instance_id, device in self.device_instances.items():
            try:
                success = await device.disconnect()
                results[instance_id] = success
                logger.info(f"Disconnected device '{instance_id}': {success}")
            except Exception as e:
                logger.error(f"Error disconnecting device '{instance_id}': {e}")
                results[instance_id] = False

        return results

    async def health_check_all(self) -> Dict[str, bool]:
        """
        Perform health check on all devices.

        Returns:
            Dictionary mapping instance_id to health status
        """
        results = {}

        for instance_id, device in self.device_instances.items():
            try:
                healthy = await device.health_check()
                results[instance_id] = healthy
            except Exception as e:
                logger.error(f"Health check failed for '{instance_id}': {e}")
                results[instance_id] = False

        return results

    def get_instance_functions(self, instance_id: str) -> List[str]:
        """
        Get available functions for an instance.

        Args:
            instance_id: Instance identifier

        Returns:
            List of function IDs

        Raises:
            ValueError: If instance not found
        """
        if instance_id not in self.function_classes:
            raise ValueError(f"Device instance '{instance_id}' not found")

        return list(self.function_classes[instance_id].keys())

    def get_plugin_id(self, instance_id: str) -> Optional[str]:
        """
        Get plugin ID for an instance.

        Args:
            instance_id: Instance identifier

        Returns:
            Plugin ID or None if not found
        """
        return self.instance_plugins.get(instance_id)
