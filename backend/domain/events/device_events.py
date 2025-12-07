"""Device-related domain events."""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class DeviceConnectedEvent:
    """Event published when a device connects successfully."""

    device_id: str
    plugin_id: str
    timestamp: datetime
    status: str

    def to_dict(self):
        """Convert to dictionary for JSON serialization."""
        return {
            "type": "device_connected",
            "device_id": self.device_id,
            "plugin_id": self.plugin_id,
            "timestamp": self.timestamp.isoformat(),
            "status": self.status
        }


@dataclass
class DeviceDisconnectedEvent:
    """Event published when a device disconnects."""

    device_id: str
    timestamp: datetime
    reason: Optional[str] = None

    def to_dict(self):
        """Convert to dictionary for JSON serialization."""
        return {
            "type": "device_disconnected",
            "device_id": self.device_id,
            "timestamp": self.timestamp.isoformat(),
            "reason": self.reason
        }


@dataclass
class DeviceErrorEvent:
    """Event published when a device encounters an error."""

    device_id: str
    timestamp: datetime
    error_message: str
    error_type: Optional[str] = None

    def to_dict(self):
        """Convert to dictionary for JSON serialization."""
        return {
            "type": "device_error",
            "device_id": self.device_id,
            "timestamp": self.timestamp.isoformat(),
            "error_message": self.error_message,
            "error_type": self.error_type
        }
