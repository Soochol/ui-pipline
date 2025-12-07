"""Pipeline repository interface."""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from datetime import datetime


class IPipelineRepository(ABC):
    """
    Interface for pipeline repository.

    Provides persistence operations for pipelines.
    """

    @abstractmethod
    async def save(self, pipeline_id: str, pipeline_data: Dict[str, Any]) -> str:
        """
        Save a pipeline.

        Args:
            pipeline_id: Unique pipeline identifier
            pipeline_data: Complete pipeline definition

        Returns:
            Pipeline ID

        Raises:
            ValueError: If pipeline data is invalid
        """
        pass

    @abstractmethod
    async def get(self, pipeline_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a pipeline by ID.

        Args:
            pipeline_id: Pipeline identifier

        Returns:
            Pipeline data or None if not found
        """
        pass

    @abstractmethod
    async def list_all(self) -> List[Dict[str, Any]]:
        """
        List all saved pipelines.

        Returns:
            List of pipeline metadata (id, name, created_at, updated_at)
        """
        pass

    @abstractmethod
    async def delete(self, pipeline_id: str) -> bool:
        """
        Delete a pipeline.

        Args:
            pipeline_id: Pipeline identifier

        Returns:
            True if deleted, False if not found
        """
        pass

    @abstractmethod
    async def exists(self, pipeline_id: str) -> bool:
        """
        Check if a pipeline exists.

        Args:
            pipeline_id: Pipeline identifier

        Returns:
            True if exists, False otherwise
        """
        pass

    @abstractmethod
    async def update(self, pipeline_id: str, pipeline_data: Dict[str, Any]) -> bool:
        """
        Update an existing pipeline.

        Args:
            pipeline_id: Pipeline identifier
            pipeline_data: Updated pipeline data

        Returns:
            True if updated, False if not found
        """
        pass
