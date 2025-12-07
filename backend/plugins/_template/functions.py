"""Example device functions."""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.base_function import BaseFunction
from typing import Any, Dict
import time


class ReadValueFunction(BaseFunction):
    """
    Read value from device.

    Function ID: read_value
    """

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute read operation.

        Args:
            inputs: {'trigger': True}

        Returns:
            {'value': float, 'timestamp': float}
        """
        # Get device instance
        device = self.get_device()

        # Check if connected
        if not device.is_connected():
            raise Exception("Device not connected")

        # Read sensor value
        value = device.read_sensor()

        # Get timestamp
        timestamp = time.time()

        return {
            'value': value,
            'timestamp': timestamp
        }


class WriteValueFunction(BaseFunction):
    """
    Write value to device.

    Function ID: write_value
    """

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute write operation.

        Args:
            inputs: {'trigger': True, 'value': float}

        Returns:
            {'complete': True, 'success': bool}
        """
        # Validate inputs
        schema = {
            'value': {'type': 'number', 'required': True}
        }
        self.validate_inputs(inputs, schema)

        # Get device instance
        device = self.get_device()

        # Check if connected
        if not device.is_connected():
            raise Exception("Device not connected")

        # Write value
        value = inputs['value']
        success = device.write_output(value)

        return {
            'complete': True,
            'success': success
        }
