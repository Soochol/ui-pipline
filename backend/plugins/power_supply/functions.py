"""Power supply functions."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.base_function import BaseFunction
from typing import Any, Dict


class ConnectFunction(BaseFunction):
    """Connect to power supply."""

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute connection."""
        device = self.get_device()
        success = await device.connect()
        return {
            'complete': success,
            'connected': success
        }


class DisconnectFunction(BaseFunction):
    """Disconnect from power supply."""

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute disconnection."""
        device = self.get_device()
        await device.disconnect()
        return {'complete': True}


class PowerOnFunction(BaseFunction):
    """Turn on power supply output."""

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute power on."""
        device = self.get_device()
        if not device.is_connected():
            raise Exception("Device not connected")

        result = await device.power_on()
        return {
            'complete': True,
            'output_on': result['output_on']
        }


class PowerOffFunction(BaseFunction):
    """Turn off power supply output."""

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute power off."""
        device = self.get_device()
        if not device.is_connected():
            raise Exception("Device not connected")

        result = await device.power_off()
        return {
            'complete': True,
            'output_on': result['output_on']
        }


class SetVoltageFunction(BaseFunction):
    """Set output voltage."""

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute set voltage."""
        schema = {
            'voltage': {'type': 'number', 'required': True}
        }
        self.validate_inputs(inputs, schema)

        device = self.get_device()
        if not device.is_connected():
            raise Exception("Device not connected")

        result = await device.set_voltage(inputs['voltage'])
        return {
            'complete': True,
            'actual_voltage': result['actual_voltage']
        }


class SetCurrentFunction(BaseFunction):
    """Set current limit."""

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute set current."""
        schema = {
            'current': {'type': 'number', 'required': True}
        }
        self.validate_inputs(inputs, schema)

        device = self.get_device()
        if not device.is_connected():
            raise Exception("Device not connected")

        result = await device.set_current(inputs['current'])
        return {
            'complete': True,
            'actual_current': result['actual_current']
        }


class GetOutputFunction(BaseFunction):
    """Get output state."""

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute get output."""
        device = self.get_device()
        if not device.is_connected():
            raise Exception("Device not connected")

        result = device.get_output()
        return {
            'complete': True,
            'voltage': result['voltage'],
            'current': result['current'],
            'output_on': result['output_on']
        }
