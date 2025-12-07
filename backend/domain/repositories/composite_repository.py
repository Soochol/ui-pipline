"""Composite Node repository interface."""

from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any

from domain.entities.composite import CompositeNodeDefinition


class ICompositeRepository(ABC):
    """
    Interface for composite node repository.

    Provides persistence operations for composite node definitions.
    """

    @abstractmethod
    async def save(self, composite: CompositeNodeDefinition) -> str:
        """
        Save a composite node definition.

        Args:
            composite: Composite node definition to save

        Returns:
            Composite ID

        Raises:
            ValueError: If composite data is invalid
        """
        pass

    @abstractmethod
    async def get(self, composite_id: str) -> Optional[CompositeNodeDefinition]:
        """
        Get a composite by ID.

        Args:
            composite_id: Composite identifier

        Returns:
            CompositeNodeDefinition or None if not found
        """
        pass

    @abstractmethod
    async def list_all(self) -> List[Dict[str, Any]]:
        """
        List all saved composites.

        Returns:
            List of composite metadata (id, name, category, created_at, updated_at)
        """
        pass

    @abstractmethod
    async def delete(self, composite_id: str) -> bool:
        """
        Delete a composite.

        Args:
            composite_id: Composite identifier

        Returns:
            True if deleted, False if not found
        """
        pass

    @abstractmethod
    async def exists(self, composite_id: str) -> bool:
        """
        Check if a composite exists.

        Args:
            composite_id: Composite identifier

        Returns:
            True if exists, False otherwise
        """
        pass

    @abstractmethod
    async def update(self, composite_id: str, composite: CompositeNodeDefinition) -> bool:
        """
        Update an existing composite.

        Args:
            composite_id: Composite identifier
            composite: Updated composite definition

        Returns:
            True if updated, False if not found
        """
        pass

    @abstractmethod
    async def get_by_category(self, category: str) -> List[CompositeNodeDefinition]:
        """
        Get all composites in a category.

        Args:
            category: Category name

        Returns:
            List of composite definitions in the category
        """
        pass
