"""Mock servo motor device."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.base_device import BaseDevice, DeviceStatus
from typing import Any, Dict
import asyncio


class MockServoDevice(BaseDevice):
    """Mock servo motor for testing."""

    def __init__(self, instance_id: str, config: Dict[str, Any]):
        """Initialize mock servo."""
        super().__init__(instance_id, config)

        self.axis = config.get('axis', 0)
        self.max_position = config.get('max_position', 1000.0)

        # Internal state
        self.current_position = 0.0
        self.current_velocity = 0.0
        self.is_homed = False

    async def connect(self) -> bool:
        """Connect to mock servo."""
        try:
            self.status = DeviceStatus.CONNECTING
            await asyncio.sleep(0.05)  # Simulate connection delay
            self.status = DeviceStatus.CONNECTED
            return True
        except Exception as e:
            self.set_error(str(e))
            return False

    async def disconnect(self) -> bool:
        """Disconnect from mock servo."""
        self.status = DeviceStatus.DISCONNECTED
        return True

    async def health_check(self) -> bool:
        """Check servo health."""
        return self.status == DeviceStatus.CONNECTED

    def get_info(self) -> Dict[str, Any]:
        """Get device info."""
        return {
            "id": self.instance_id,
            "type": "mock_servo",
            "status": self.get_status(),
            "config": {
                "axis": self.axis,
                "max_position": self.max_position
            },
            "state": {
                "position": self.current_position,
                "velocity": self.current_velocity,
                "homed": self.is_homed
            }
        }

    async def home_axis(self) -> float:
        """Home the servo axis."""
        await asyncio.sleep(0.1)  # Simulate homing time
        self.current_position = 0.0
        self.current_velocity = 0.0
        self.is_homed = True
        return self.current_position

    async def move_to_position(self, position: float, speed: float = 100.0) -> float:
        """Move to target position."""
        if position < 0 or position > self.max_position:
            raise ValueError(f"Position {position} out of range [0, {self.max_position}]")

        # Simulate movement
        distance = abs(position - self.current_position)
        move_time = distance / speed if speed > 0 else 0.1
        await asyncio.sleep(min(move_time, 0.2))  # Cap simulation time

        self.current_position = position
        self.current_velocity = 0.0
        return self.current_position

    def read_position(self) -> Dict[str, float]:
        """Read current position and velocity."""
        return {
            "position": self.current_position,
            "velocity": self.current_velocity
        }
