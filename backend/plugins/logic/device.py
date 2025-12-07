"""Logic device implementation - Virtual device for logic operations."""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.base_device import BaseDevice, DeviceStatus
from typing import Any, Dict


class LogicDevice(BaseDevice):
    """
    Virtual device for logic operations.

    This device doesn't connect to physical hardware.
    It provides logic functions like delay, branch, print, etc.
    """

    def __init__(self, instance_id: str, config: Dict[str, Any]):
        """
        Initialize logic device.

        Args:
            instance_id: Unique device instance ID
            config: Device configuration
        """
        super().__init__(instance_id, config)

    async def connect(self) -> bool:
        """
        Connect to the device (virtual - always succeeds).

        Returns:
            True (always)
        """
        self.status = DeviceStatus.CONNECTED
        return True

    async def disconnect(self) -> bool:
        """
        Disconnect from the device (virtual - always succeeds).

        Returns:
            True (always)
        """
        self.status = DeviceStatus.DISCONNECTED
        return True

    async def health_check(self) -> bool:
        """
        Check device health (virtual - always healthy when connected).

        Returns:
            True if connected
        """
        return self.status == DeviceStatus.CONNECTED

    def get_info(self) -> Dict[str, Any]:
        """
        Get device information.

        Returns:
            Device info dictionary
        """
        return {
            "id": self.instance_id,
            "type": "logic_device",
            "status": self.get_status(),
            "config": {},
            "error": self.get_error()
        }
