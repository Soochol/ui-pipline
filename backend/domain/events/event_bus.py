"""Event Bus for publish-subscribe pattern."""

import asyncio
import logging
from typing import Callable, Dict, List, Type, Any

logger = logging.getLogger(__name__)


class EventBus:
    """
    Event Bus for decoupling components via events.

    Implements publish-subscribe pattern for loose coupling.
    """

    def __init__(self):
        """Initialize event bus."""
        self._subscribers: Dict[Type, List[Callable]] = {}
        self._lock = asyncio.Lock()

    def subscribe(self, event_type: Type, handler: Callable) -> None:
        """
        Subscribe to an event type.

        Args:
            event_type: Event class type
            handler: Async function to handle the event
        """
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []

        self._subscribers[event_type].append(handler)
        logger.info(f"Subscribed {handler.__name__} to {event_type.__name__}")

    def unsubscribe(self, event_type: Type, handler: Callable) -> None:
        """
        Unsubscribe from an event type.

        Args:
            event_type: Event class type
            handler: Handler function to remove
        """
        if event_type in self._subscribers:
            try:
                self._subscribers[event_type].remove(handler)
                logger.info(f"Unsubscribed {handler.__name__} from {event_type.__name__}")
            except ValueError:
                logger.warning(f"Handler {handler.__name__} not found for {event_type.__name__}")

    async def publish(self, event: Any) -> None:
        """
        Publish an event to all subscribers.

        Args:
            event: Event instance to publish
        """
        event_type = type(event)

        if event_type not in self._subscribers:
            logger.debug(f"No subscribers for {event_type.__name__}")
            return

        async with self._lock:
            handlers = self._subscribers[event_type].copy()

        logger.debug(f"Publishing {event_type.__name__} to {len(handlers)} subscribers")

        # Execute all handlers concurrently
        tasks = []
        for handler in handlers:
            try:
                task = asyncio.create_task(self._safe_execute(handler, event))
                tasks.append(task)
            except Exception as e:
                logger.error(f"Error creating task for {handler.__name__}: {e}")

        # Wait for all handlers to complete
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Log any exceptions
            for handler, result in zip(handlers, results):
                if isinstance(result, Exception):
                    logger.error(
                        f"Error in event handler {handler.__name__} "
                        f"for {event_type.__name__}: {result}"
                    )

    async def _safe_execute(self, handler: Callable, event: Any) -> None:
        """
        Safely execute a handler with error handling.

        Args:
            handler: Handler function
            event: Event instance
        """
        try:
            if asyncio.iscoroutinefunction(handler):
                await handler(event)
            else:
                handler(event)
        except Exception as e:
            logger.error(f"Exception in {handler.__name__}: {e}", exc_info=True)
            raise

    def get_subscribers_count(self, event_type: Type) -> int:
        """
        Get number of subscribers for an event type.

        Args:
            event_type: Event class type

        Returns:
            Number of subscribers
        """
        return len(self._subscribers.get(event_type, []))

    def clear_all_subscribers(self) -> None:
        """Clear all subscribers (for testing)."""
        self._subscribers.clear()
        logger.info("Cleared all event subscribers")


# Global event bus instance
event_bus = EventBus()
