"""Mock servo motor functions."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.base_function import BaseFunction
from typing import Any, Dict


class HomeFunction(BaseFunction):
    """Home servo axis function."""

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute homing."""
        device = self.get_device()

        if not device.is_connected():
            raise Exception("Device not connected")

        position = await device.home_axis()

        return {
            'complete': True,
            'position': position
        }


class MoveFunction(BaseFunction):
    """Move servo to position function."""

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute move."""
        # Validate inputs
        schema = {
            'position': {'type': 'number', 'required': True},
            'speed': {'type': 'number', 'required': False, 'default': 100.0}
        }
        self.validate_inputs(inputs, schema)

        device = self.get_device()

        if not device.is_connected():
            raise Exception("Device not connected")

        position = await device.move_to_position(
            inputs['position'],
            inputs['speed']
        )

        return {
            'complete': True,
            'position': position
        }


class GetPositionFunction(BaseFunction):
    """Get servo position function."""

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute position read."""
        device = self.get_device()

        if not device.is_connected():
            raise Exception("Device not connected")

        state = device.read_position()

        return {
            'position': state['position'],
            'velocity': state['velocity']
        }
