"""Loadcell indicator device."""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.base_device import BaseDevice, DeviceStatus
from typing import Any, Dict
import asyncio
import random


class LoadcellDevice(BaseDevice):
    """Loadcell indicator device."""

    def __init__(self, instance_id: str, config: Dict[str, Any]):
        """Initialize loadcell device."""
        super().__init__(instance_id, config)

        self.port = config.get('port', 'COM2')
        self.baudrate = config.get('baudrate', 9600)
        self.unit = config.get('unit', 'g')
        self.decimal_places = config.get('decimal_places', 2)

        # Internal state
        self.tare_offset = 0.0
        self.current_value = 0.0
        self.is_stable = True

    async def connect(self) -> bool:
        """Connect to loadcell indicator."""
        try:
            self.status = DeviceStatus.CONNECTING
            await asyncio.sleep(0.1)
            self.status = DeviceStatus.CONNECTED
            return True
        except Exception as e:
            self.set_error(str(e))
            return False

    async def disconnect(self) -> bool:
        """Disconnect from loadcell indicator."""
        self.status = DeviceStatus.DISCONNECTED
        return True

    async def health_check(self) -> bool:
        """Check device health."""
        return self.status == DeviceStatus.CONNECTED

    def get_info(self) -> Dict[str, Any]:
        """Get device info."""
        return {
            "id": self.instance_id,
            "type": "loadcell",
            "status": self.get_status(),
            "config": {
                "port": self.port,
                "baudrate": self.baudrate,
                "unit": self.unit,
                "decimal_places": self.decimal_places
            },
            "state": {
                "value": self.current_value,
                "tare_offset": self.tare_offset,
                "stable": self.is_stable
            }
        }

    async def tare(self) -> Dict[str, Any]:
        """Zero the loadcell."""
        await asyncio.sleep(0.1)
        self.tare_offset = self.current_value
        return {"success": True}

    async def get_value(self) -> Dict[str, Any]:
        """Read current value."""
        await asyncio.sleep(0.02)

        # Simulate measurement
        raw_value = 50.0 + random.uniform(-2.0, 2.0)
        self.current_value = round(raw_value - self.tare_offset, self.decimal_places)
        self.is_stable = random.random() > 0.1  # 90% stable

        return {
            "value": self.current_value,
            "unit": self.unit,
            "stable": self.is_stable
        }

    async def get_average(self, samples: int = 5) -> Dict[str, Any]:
        """Read averaged value."""
        values = []
        for _ in range(samples):
            await asyncio.sleep(0.02)
            raw_value = 50.0 + random.uniform(-2.0, 2.0)
            values.append(raw_value - self.tare_offset)

        avg_value = sum(values) / len(values)
        self.current_value = round(avg_value, self.decimal_places)

        # Check stability (low variance = stable)
        variance = sum((v - avg_value) ** 2 for v in values) / len(values)
        self.is_stable = variance < 0.5

        return {
            "value": self.current_value,
            "unit": self.unit,
            "stable": self.is_stable
        }

    def evaluate(self, value: float, spec_min: float, spec_max: float) -> Dict[str, Any]:
        """Evaluate value against spec."""
        is_pass = spec_min <= value <= spec_max
        return {
            "result": "PASS" if is_pass else "FAIL",
            "is_pass": is_pass,
            "value": value,
            "spec_min": spec_min,
            "spec_max": spec_max
        }
