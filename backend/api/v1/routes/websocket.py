"""WebSocket endpoint for real-time updates."""

import logging
from typing import List
from fastapi import WebSocket, WebSocketDisconnect
from domain.events import (
    event_bus,
    DeviceConnectedEvent,
    DeviceDisconnectedEvent,
    DeviceErrorEvent,
    PipelineStartedEvent,
    NodeExecutingEvent,
    NodeCompletedEvent,
    PipelineCompletedEvent,
    PipelineErrorEvent,
)

logger = logging.getLogger(__name__)


class WebSocketManager:
    """
    Manages WebSocket connections and broadcasts events.
    """

    def __init__(self):
        """Initialize WebSocket manager."""
        self.active_connections: List[WebSocket] = []
        self._setup_event_subscribers()

    async def connect(self, websocket: WebSocket):
        """
        Accept and register a new WebSocket connection.

        Args:
            websocket: WebSocket connection
        """
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

        # Send welcome message
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to UI Pipeline System",
            "connections": len(self.active_connections)
        })

    def disconnect(self, websocket: WebSocket):
        """
        Remove WebSocket connection.

        Args:
            websocket: WebSocket connection to remove
        """
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """
        Broadcast message to all connected clients.

        Args:
            message: Dictionary to send as JSON
        """
        disconnected = []

        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error sending to WebSocket: {e}")
                disconnected.append(connection)

        # Remove disconnected clients
        for connection in disconnected:
            self.disconnect(connection)

    def _setup_event_subscribers(self):
        """Subscribe to domain events for broadcasting."""

        # Device events
        event_bus.subscribe(DeviceConnectedEvent, self._on_device_connected)
        event_bus.subscribe(DeviceDisconnectedEvent, self._on_device_disconnected)
        event_bus.subscribe(DeviceErrorEvent, self._on_device_error)

        # Pipeline events
        event_bus.subscribe(PipelineStartedEvent, self._on_pipeline_started)
        event_bus.subscribe(NodeExecutingEvent, self._on_node_executing)
        event_bus.subscribe(NodeCompletedEvent, self._on_node_completed)
        event_bus.subscribe(PipelineCompletedEvent, self._on_pipeline_completed)
        event_bus.subscribe(PipelineErrorEvent, self._on_pipeline_error)

        logger.info("WebSocket manager subscribed to domain events")

    # Event handlers
    async def _on_device_connected(self, event: DeviceConnectedEvent):
        """Handle device connected event."""
        await self.broadcast(event.to_dict())

    async def _on_device_disconnected(self, event: DeviceDisconnectedEvent):
        """Handle device disconnected event."""
        await self.broadcast(event.to_dict())

    async def _on_device_error(self, event: DeviceErrorEvent):
        """Handle device error event."""
        await self.broadcast(event.to_dict())

    async def _on_pipeline_started(self, event: PipelineStartedEvent):
        """Handle pipeline started event."""
        await self.broadcast(event.to_dict())

    async def _on_node_executing(self, event: NodeExecutingEvent):
        """Handle node executing event."""
        await self.broadcast(event.to_dict())

    async def _on_node_completed(self, event: NodeCompletedEvent):
        """Handle node completed event."""
        await self.broadcast(event.to_dict())

    async def _on_pipeline_completed(self, event: PipelineCompletedEvent):
        """Handle pipeline completed event."""
        await self.broadcast(event.to_dict())

    async def _on_pipeline_error(self, event: PipelineErrorEvent):
        """Handle pipeline error event."""
        await self.broadcast(event.to_dict())


# Global WebSocket manager instance
ws_manager = WebSocketManager()


async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for real-time updates.

    Args:
        websocket: WebSocket connection
    """
    await ws_manager.connect(websocket)

    try:
        while True:
            # Keep connection alive and listen for client messages
            data = await websocket.receive_text()
            logger.debug(f"Received from client: {data}")

            # Echo back or handle client messages if needed
            # For now, just acknowledge
            await websocket.send_json({
                "type": "ack",
                "message": "Message received"
            })

    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
        logger.info("Client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket)
