"""Power supply device."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.base_device import BaseDevice, DeviceStatus
from typing import Any, Dict
import asyncio
import random


class PowerSupplyDevice(BaseDevice):
    """Power supply control device."""

    def __init__(self, instance_id: str, config: Dict[str, Any]):
        """Initialize power supply device."""
        super().__init__(instance_id, config)

        self.port = config.get('port', 'COM1')
        self.baudrate = config.get('baudrate', 9600)
        self.max_voltage = config.get('max_voltage', 30.0)
        self.max_current = config.get('max_current', 5.0)

        # Internal state
        self.output_on = False
        self.set_voltage_value = 0.0
        self.set_current_value = 0.0
        self.actual_voltage = 0.0
        self.actual_current = 0.0

    async def connect(self) -> bool:
        """Connect to power supply."""
        try:
            self.status = DeviceStatus.CONNECTING
            await asyncio.sleep(0.1)
            self.status = DeviceStatus.CONNECTED
            return True
        except Exception as e:
            self.set_error(str(e))
            return False

    async def disconnect(self) -> bool:
        """Disconnect from power supply."""
        self.status = DeviceStatus.DISCONNECTED
        return True

    async def health_check(self) -> bool:
        """Check device health."""
        return self.status == DeviceStatus.CONNECTED

    def get_info(self) -> Dict[str, Any]:
        """Get device info."""
        return {
            "id": self.instance_id,
            "type": "power_supply",
            "status": self.get_status(),
            "config": {
                "port": self.port,
                "baudrate": self.baudrate,
                "max_voltage": self.max_voltage,
                "max_current": self.max_current
            },
            "state": {
                "output_on": self.output_on,
                "voltage": self.actual_voltage,
                "current": self.actual_current
            }
        }

    async def power_on(self) -> Dict[str, Any]:
        """Turn on output."""
        await asyncio.sleep(0.05)
        self.output_on = True
        self.actual_voltage = self.set_voltage_value + random.uniform(-0.02, 0.02)
        self.actual_current = random.uniform(0.01, 0.1)
        return {"output_on": self.output_on}

    async def power_off(self) -> Dict[str, Any]:
        """Turn off output."""
        await asyncio.sleep(0.05)
        self.output_on = False
        self.actual_voltage = 0.0
        self.actual_current = 0.0
        return {"output_on": self.output_on}

    async def set_voltage(self, voltage: float) -> Dict[str, Any]:
        """Set output voltage."""
        if voltage < 0 or voltage > self.max_voltage:
            raise ValueError(f"Voltage {voltage} out of range [0, {self.max_voltage}]")

        await asyncio.sleep(0.05)
        self.set_voltage_value = voltage
        if self.output_on:
            self.actual_voltage = voltage + random.uniform(-0.02, 0.02)
        return {"actual_voltage": round(self.actual_voltage, 3)}

    async def set_current(self, current: float) -> Dict[str, Any]:
        """Set current limit."""
        if current < 0 or current > self.max_current:
            raise ValueError(f"Current {current} out of range [0, {self.max_current}]")

        await asyncio.sleep(0.05)
        self.set_current_value = current
        return {"actual_current": round(self.set_current_value, 3)}

    def get_output(self) -> Dict[str, Any]:
        """Get current output state."""
        return {
            "voltage": round(self.actual_voltage, 3),
            "current": round(self.actual_current, 3),
            "output_on": self.output_on
        }
