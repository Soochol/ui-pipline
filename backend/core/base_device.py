"""Base device class for all hardware plugins."""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Any, Dict, Optional
from datetime import datetime


class DeviceStatus(Enum):
    """Device connection status."""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"


class BaseDevice(ABC):
    """
    Abstract base class for all hardware devices.

    All plugin devices must inherit from this class and implement
    the abstract methods.
    """

    def __init__(self, instance_id: str, config: Dict[str, Any]):
        """
        Initialize device instance.

        Args:
            instance_id: Unique identifier for this device instance
            config: Device configuration from user
        """
        self.instance_id = instance_id
        self.config = config
        self.status = DeviceStatus.DISCONNECTED
        self.error_message: Optional[str] = None
        self.last_health_check: Optional[datetime] = None

    @abstractmethod
    async def connect(self) -> bool:
        """
        Connect to the hardware device.

        Returns:
            True if connection successful, False otherwise
        """
        pass

    @abstractmethod
    async def disconnect(self) -> bool:
        """
        Disconnect from the hardware device.

        Returns:
            True if disconnection successful, False otherwise
        """
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """
        Check if device is healthy and responsive.

        Returns:
            True if device is healthy, False otherwise
        """
        pass

    @abstractmethod
    def get_info(self) -> Dict[str, Any]:
        """
        Get device information.

        Returns:
            Dictionary with device info (id, type, status, config, etc.)
        """
        pass

    def set_error(self, message: str) -> None:
        """
        Set device error state.

        Args:
            message: Error message
        """
        self.status = DeviceStatus.ERROR
        self.error_message = message

    def clear_error(self) -> None:
        """Clear error state."""
        if self.status == DeviceStatus.ERROR:
            self.status = DeviceStatus.DISCONNECTED
            self.error_message = None

    def is_connected(self) -> bool:
        """Check if device is currently connected."""
        return self.status == DeviceStatus.CONNECTED

    def get_status(self) -> str:
        """Get current status as string."""
        return self.status.value

    def get_error(self) -> Optional[str]:
        """Get current error message if any."""
        return self.error_message
