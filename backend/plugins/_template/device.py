"""Example device implementation."""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.base_device import BaseDevice, DeviceStatus
from typing import Any, Dict
import asyncio


class ExampleDevice(BaseDevice):
    """
    Example device implementation.

    This is a template for creating custom device plugins.
    Copy and modify this class for your specific hardware.
    """

    def __init__(self, instance_id: str, config: Dict[str, Any]):
        """
        Initialize device.

        Args:
            instance_id: Unique device instance ID
            config: Device configuration from user
        """
        super().__init__(instance_id, config)

        # Get configuration parameters
        self.port = config.get('port', 'COM1')
        self.baudrate = config.get('baudrate', 9600)

        # Internal state
        self.connection = None
        self.current_value = 0.0

    async def connect(self) -> bool:
        """
        Connect to the device.

        Returns:
            True if connection successful
        """
        try:
            self.status = DeviceStatus.CONNECTING

            # TODO: Implement actual connection logic
            # Example: self.connection = serial.Serial(self.port, self.baudrate)

            # Simulate connection delay
            await asyncio.sleep(0.1)

            # For template, always succeed
            self.status = DeviceStatus.CONNECTED
            return True

        except Exception as e:
            self.set_error(f"Connection failed: {str(e)}")
            return False

    async def disconnect(self) -> bool:
        """
        Disconnect from the device.

        Returns:
            True if disconnection successful
        """
        try:
            # TODO: Implement actual disconnection logic
            # Example: if self.connection: self.connection.close()

            self.connection = None
            self.status = DeviceStatus.DISCONNECTED
            return True

        except Exception as e:
            self.set_error(f"Disconnection failed: {str(e)}")
            return False

    async def health_check(self) -> bool:
        """
        Check device health.

        Returns:
            True if device is healthy
        """
        # TODO: Implement actual health check
        # Example: Send ping command and check response

        return self.status == DeviceStatus.CONNECTED

    def get_info(self) -> Dict[str, Any]:
        """
        Get device information.

        Returns:
            Device info dictionary
        """
        return {
            "id": self.instance_id,
            "type": "example_device",
            "status": self.get_status(),
            "config": {
                "port": self.port,
                "baudrate": self.baudrate
            },
            "error": self.get_error()
        }

    # Helper methods for functions
    def read_sensor(self) -> float:
        """Read sensor value (mock implementation)."""
        # TODO: Implement actual sensor reading
        self.current_value += 1.0
        return self.current_value

    def write_output(self, value: float) -> bool:
        """Write output value (mock implementation)."""
        # TODO: Implement actual output writing
        self.current_value = value
        return True
