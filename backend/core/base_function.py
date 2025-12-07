"""Base function class for all device functions."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from .base_device import BaseDevice


class BaseFunction(ABC):
    """
    Abstract base class for all device functions.

    Each function represents a specific operation that can be performed
    on a device (e.g., move, read, write, etc.).
    """

    def __init__(self, device_instance: BaseDevice):
        """
        Initialize function with device instance.

        Args:
            device_instance: The device instance this function operates on
        """
        self.device_instance = device_instance

    @abstractmethod
    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the function with given inputs.

        Args:
            inputs: Input parameters from connected nodes

        Returns:
            Dictionary of output values
        """
        pass

    def get_device(self) -> BaseDevice:
        """
        Get the associated device instance.

        Returns:
            The device instance
        """
        return self.device_instance

    def validate_inputs(
        self,
        inputs: Dict[str, Any],
        schema: Dict[str, Dict[str, Any]]
    ) -> bool:
        """
        Validate inputs against schema.

        Args:
            inputs: Input parameters to validate
            schema: Schema defining required inputs
                Example: {
                    "position": {"type": "number", "required": True},
                    "speed": {"type": "number", "required": False, "default": 100.0}
                }

        Returns:
            True if inputs are valid

        Raises:
            ValueError: If required inputs are missing or types are invalid
        """
        for input_name, input_schema in schema.items():
            is_required = input_schema.get("required", False)
            expected_type = input_schema.get("type")

            # Check required inputs
            if is_required and input_name not in inputs:
                raise ValueError(f"Required input '{input_name}' is missing")

            # Apply default values
            if input_name not in inputs and "default" in input_schema:
                inputs[input_name] = input_schema["default"]

            # Validate type if input is present
            if input_name in inputs and expected_type:
                value = inputs[input_name]
                if not self._validate_type(value, expected_type):
                    raise ValueError(
                        f"Input '{input_name}' has invalid type. "
                        f"Expected: {expected_type}, Got: {type(value).__name__}"
                    )

        return True

    def _validate_type(self, value: Any, expected_type: str) -> bool:
        """
        Validate value type against expected type string.

        Args:
            value: Value to validate
            expected_type: Expected type as string (e.g., "number", "string")

        Returns:
            True if type matches
        """
        type_map = {
            "number": (int, float),
            "string": str,
            "boolean": bool,
            "array": (list, tuple),
            "object": dict,
            "trigger": bool,
            "any": object
        }

        if expected_type == "any":
            return True

        expected_python_type = type_map.get(expected_type)
        if expected_python_type is None:
            # Unknown type, assume valid
            return True

        return isinstance(value, expected_python_type)

    def get_function_info(self) -> Dict[str, Any]:
        """
        Get function information.

        Returns:
            Dictionary with function metadata
        """
        return {
            "class": self.__class__.__name__,
            "device_id": self.device_instance.instance_id,
            "device_status": self.device_instance.get_status()
        }
