"""JSON file-based composite node repository implementation."""

import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

from domain.repositories.composite_repository import ICompositeRepository
from domain.entities.composite import CompositeNodeDefinition

logger = logging.getLogger(__name__)


class JsonCompositeRepository(ICompositeRepository):
    """
    JSON file-based composite node storage.

    Each composite is stored as a separate JSON file.
    """

    def __init__(self, storage_dir: str = "data/composites"):
        """
        Initialize JSON repository.

        Args:
            storage_dir: Directory to store composite files
        """
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"JsonCompositeRepository initialized with directory: {self.storage_dir}")

    def _get_file_path(self, composite_id: str) -> Path:
        """Get file path for a composite."""
        # Sanitize composite_id to prevent directory traversal
        safe_id = "".join(c for c in composite_id if c.isalnum() or c in ('_', '-'))
        return self.storage_dir / f"{safe_id}.json"

    def _get_metadata_path(self) -> Path:
        """Get path for metadata index file."""
        return self.storage_dir / "_metadata.json"

    async def _load_metadata(self) -> Dict[str, Any]:
        """Load metadata index."""
        metadata_path = self._get_metadata_path()
        if not metadata_path.exists():
            return {}

        try:
            with open(metadata_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading metadata: {e}")
            return {}

    async def _save_metadata(self, metadata: Dict[str, Any]):
        """Save metadata index."""
        metadata_path = self._get_metadata_path()
        try:
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(metadata, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error saving metadata: {e}")

    async def save(self, composite: CompositeNodeDefinition) -> str:
        """
        Save a composite node definition to JSON file.

        Args:
            composite: Composite node definition to save

        Returns:
            Composite ID
        """
        # Validate before saving
        errors = composite.validate()
        if errors:
            raise ValueError(f"Invalid composite: {', '.join(errors)}")

        file_path = self._get_file_path(composite.composite_id)

        # Update timestamp
        composite.updated_at = datetime.now()

        try:
            # Save composite file
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(composite.to_dict(), f, indent=2, ensure_ascii=False)

            # Update metadata index
            metadata = await self._load_metadata()
            metadata[composite.composite_id] = {
                "id": composite.composite_id,
                "name": composite.name,
                "category": composite.category,
                "color": composite.color,
                "version": composite.version,
                "author": composite.author,
                "input_count": len(composite.inputs),
                "output_count": len(composite.outputs),
                "created_at": composite.created_at.isoformat() if composite.created_at else None,
                "updated_at": composite.updated_at.isoformat() if composite.updated_at else None,
            }
            await self._save_metadata(metadata)

            logger.info(f"Saved composite: {composite.composite_id}")
            return composite.composite_id

        except Exception as e:
            logger.error(f"Error saving composite {composite.composite_id}: {e}")
            raise ValueError(f"Failed to save composite: {str(e)}")

    async def get(self, composite_id: str) -> Optional[CompositeNodeDefinition]:
        """
        Get a composite by ID.

        Args:
            composite_id: Composite identifier

        Returns:
            CompositeNodeDefinition or None if not found
        """
        file_path = self._get_file_path(composite_id)

        if not file_path.exists():
            logger.debug(f"Composite not found: {composite_id}")
            return None

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return CompositeNodeDefinition.from_dict(data)

        except Exception as e:
            logger.error(f"Error loading composite {composite_id}: {e}")
            return None

    async def list_all(self) -> List[Dict[str, Any]]:
        """
        List all saved composites.

        Returns:
            List of composite metadata
        """
        metadata = await self._load_metadata()
        return list(metadata.values())

    async def delete(self, composite_id: str) -> bool:
        """
        Delete a composite.

        Args:
            composite_id: Composite identifier

        Returns:
            True if deleted, False if not found
        """
        file_path = self._get_file_path(composite_id)

        if not file_path.exists():
            logger.debug(f"Composite not found for deletion: {composite_id}")
            return False

        try:
            # Delete file
            file_path.unlink()

            # Update metadata
            metadata = await self._load_metadata()
            if composite_id in metadata:
                del metadata[composite_id]
                await self._save_metadata(metadata)

            logger.info(f"Deleted composite: {composite_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting composite {composite_id}: {e}")
            return False

    async def exists(self, composite_id: str) -> bool:
        """
        Check if a composite exists.

        Args:
            composite_id: Composite identifier

        Returns:
            True if exists
        """
        file_path = self._get_file_path(composite_id)
        return file_path.exists()

    async def update(self, composite_id: str, composite: CompositeNodeDefinition) -> bool:
        """
        Update an existing composite.

        Args:
            composite_id: Composite identifier
            composite: Updated composite definition

        Returns:
            True if updated, False if not found
        """
        if not await self.exists(composite_id):
            logger.debug(f"Composite not found for update: {composite_id}")
            return False

        # Get existing data to preserve created_at
        existing = await self.get(composite_id)
        if existing:
            composite.created_at = existing.created_at

        await self.save(composite)
        return True

    async def get_by_category(self, category: str) -> List[CompositeNodeDefinition]:
        """
        Get all composites in a category.

        Args:
            category: Category name

        Returns:
            List of composite definitions in the category
        """
        result = []
        metadata = await self._load_metadata()

        for meta in metadata.values():
            if meta.get("category") == category:
                composite = await self.get(meta["id"])
                if composite:
                    result.append(composite)

        return result
