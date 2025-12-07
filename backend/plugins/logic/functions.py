"""Logic control functions."""

import sys
from pathlib import Path
import asyncio
import logging

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from core.base_function import BaseFunction
from typing import Any, Dict

logger = logging.getLogger(__name__)


class DelayFunction(BaseFunction):
    """
    Delay function - waits for a specified duration.

    Function ID: delay
    """

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute delay.

        Args:
            inputs: {
                'trigger': True,
                'duration_ms': int (milliseconds, from config)
            }

        Returns:
            {'complete': True}
        """
        # Get duration from config (in milliseconds)
        duration_ms = inputs.get('duration_ms', 1000)

        # Convert to seconds
        duration_sec = duration_ms / 1000.0

        logger.info(f"Delay: waiting {duration_ms}ms ({duration_sec}s)")

        # Wait
        await asyncio.sleep(duration_sec)

        logger.info(f"Delay: complete after {duration_ms}ms")

        return {
            'complete': True
        }


class BranchFunction(BaseFunction):
    """
    Branch function - conditional branching.

    Function ID: branch
    """

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute branch.

        Args:
            inputs: {
                'trigger': True,
                'condition': bool
            }

        Returns:
            {'true': True} or {'false': True} based on condition
        """
        condition = inputs.get('condition', False)

        logger.info(f"Branch: condition is {condition}")

        if condition:
            return {
                'true': True,
                'false': False
            }
        else:
            return {
                'true': False,
                'false': True
            }


class PrintFunction(BaseFunction):
    """
    Print function - prints a message to console/log.

    Function ID: print
    """

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute print.

        Args:
            inputs: {
                'trigger': True,
                'message': str
            }

        Returns:
            {'complete': True}
        """
        message = inputs.get('message', '')

        # Print to console and log
        print(f"[Pipeline Print] {message}")
        logger.info(f"Print: {message}")

        return {
            'complete': True
        }


class SetVariableFunction(BaseFunction):
    """
    Set variable function - passes through a value.

    Function ID: set_variable
    """

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute set variable.

        Args:
            inputs: {
                'trigger': True,
                'value': any
            }

        Returns:
            {'complete': True, 'value': any}
        """
        value = inputs.get('value', None)

        logger.info(f"SetVariable: value = {value}")

        return {
            'complete': True,
            'value': value
        }
