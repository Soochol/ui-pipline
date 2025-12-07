"""Loadcell indicator functions."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.base_function import BaseFunction
from typing import Any, Dict


class ConnectFunction(BaseFunction):
    """Connect to loadcell indicator."""

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute connection."""
        device = self.get_device()
        success = await device.connect()
        return {
            'complete': success,
            'connected': success
        }


class DisconnectFunction(BaseFunction):
    """Disconnect from loadcell indicator."""

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute disconnection."""
        device = self.get_device()
        await device.disconnect()
        return {'complete': True}


class TareFunction(BaseFunction):
    """Tare (zero) the loadcell."""

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute tare."""
        device = self.get_device()
        if not device.is_connected():
            raise Exception("Device not connected")

        result = await device.tare()
        return {
            'complete': True,
            'success': result['success']
        }


class GetValueFunction(BaseFunction):
    """Get current loadcell value."""

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute get value."""
        device = self.get_device()
        if not device.is_connected():
            raise Exception("Device not connected")

        result = await device.get_value()
        return {
            'complete': True,
            'value': result['value'],
            'unit': result['unit'],
            'stable': result['stable']
        }


class GetAverageFunction(BaseFunction):
    """Get averaged loadcell value."""

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute get average."""
        schema = {
            'samples': {'type': 'number', 'required': False, 'default': 5}
        }
        self.validate_inputs(inputs, schema)

        device = self.get_device()
        if not device.is_connected():
            raise Exception("Device not connected")

        samples = int(inputs.get('samples', 5))
        result = await device.get_average(samples)
        return {
            'complete': True,
            'value': result['value'],
            'unit': result['unit'],
            'stable': result['stable']
        }


class EvaluateFunction(BaseFunction):
    """Evaluate value against spec."""

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute evaluation."""
        schema = {
            'value': {'type': 'number', 'required': True},
            'spec_min': {'type': 'number', 'required': True},
            'spec_max': {'type': 'number', 'required': True}
        }
        self.validate_inputs(inputs, schema)

        device = self.get_device()
        if not device.is_connected():
            raise Exception("Device not connected")

        result = device.evaluate(
            inputs['value'],
            inputs['spec_min'],
            inputs['spec_max']
        )

        return {
            'pass': result['is_pass'],
            'fail': not result['is_pass'],
            'result': result['result'],
            'value': result['value']
        }
