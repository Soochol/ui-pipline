"""JSON file-based pipeline repository implementation."""

import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

from domain.repositories.pipeline_repository import IPipelineRepository

logger = logging.getLogger(__name__)


class JsonPipelineRepository(IPipelineRepository):
    """
    JSON file-based pipeline storage.

    Each pipeline is stored as a separate JSON file.
    Simple implementation suitable for small-scale deployments.
    """

    def __init__(self, storage_dir: str = "data/pipelines"):
        """
        Initialize JSON repository.

        Args:
            storage_dir: Directory to store pipeline files
        """
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"JsonPipelineRepository initialized with directory: {self.storage_dir}")

    def _get_file_path(self, pipeline_id: str) -> Path:
        """Get file path for a pipeline."""
        # Sanitize pipeline_id to prevent directory traversal
        safe_id = "".join(c for c in pipeline_id if c.isalnum() or c in ('_', '-'))
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

    async def save(self, pipeline_id: str, pipeline_data: Dict[str, Any]) -> str:
        """
        Save a pipeline to JSON file.

        Args:
            pipeline_id: Pipeline identifier
            pipeline_data: Complete pipeline definition

        Returns:
            Pipeline ID
        """
        file_path = self._get_file_path(pipeline_id)

        # Add metadata
        now = datetime.now().isoformat()
        full_data = {
            "pipeline_id": pipeline_id,
            "name": pipeline_data.get("name", "Untitled Pipeline"),
            "created_at": pipeline_data.get("created_at", now),
            "updated_at": now,
            "data": pipeline_data
        }

        try:
            # Save pipeline file
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(full_data, f, indent=2, ensure_ascii=False)

            # Update metadata index
            metadata = await self._load_metadata()
            metadata[pipeline_id] = {
                "id": pipeline_id,
                "name": full_data["name"],
                "created_at": full_data["created_at"],
                "updated_at": full_data["updated_at"]
            }
            await self._save_metadata(metadata)

            logger.info(f"Saved pipeline: {pipeline_id}")
            return pipeline_id

        except Exception as e:
            logger.error(f"Error saving pipeline {pipeline_id}: {e}")
            raise ValueError(f"Failed to save pipeline: {str(e)}")

    async def get(self, pipeline_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a pipeline by ID.

        Args:
            pipeline_id: Pipeline identifier

        Returns:
            Pipeline data or None if not found
        """
        file_path = self._get_file_path(pipeline_id)

        if not file_path.exists():
            logger.debug(f"Pipeline not found: {pipeline_id}")
            return None

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                full_data = json.load(f)
                return full_data.get("data", full_data)

        except Exception as e:
            logger.error(f"Error loading pipeline {pipeline_id}: {e}")
            return None

    async def list_all(self) -> List[Dict[str, Any]]:
        """
        List all saved pipelines.

        Returns:
            List of pipeline metadata
        """
        metadata = await self._load_metadata()
        return list(metadata.values())

    async def delete(self, pipeline_id: str) -> bool:
        """
        Delete a pipeline.

        Args:
            pipeline_id: Pipeline identifier

        Returns:
            True if deleted, False if not found
        """
        file_path = self._get_file_path(pipeline_id)

        if not file_path.exists():
            logger.debug(f"Pipeline not found for deletion: {pipeline_id}")
            return False

        try:
            # Delete file
            file_path.unlink()

            # Update metadata
            metadata = await self._load_metadata()
            if pipeline_id in metadata:
                del metadata[pipeline_id]
                await self._save_metadata(metadata)

            logger.info(f"Deleted pipeline: {pipeline_id}")
            return True

        except Exception as e:
            logger.error(f"Error deleting pipeline {pipeline_id}: {e}")
            return False

    async def exists(self, pipeline_id: str) -> bool:
        """
        Check if a pipeline exists.

        Args:
            pipeline_id: Pipeline identifier

        Returns:
            True if exists
        """
        file_path = self._get_file_path(pipeline_id)
        return file_path.exists()

    async def update(self, pipeline_id: str, pipeline_data: Dict[str, Any]) -> bool:
        """
        Update an existing pipeline.

        Args:
            pipeline_id: Pipeline identifier
            pipeline_data: Updated pipeline data

        Returns:
            True if updated, False if not found
        """
        if not await self.exists(pipeline_id):
            logger.debug(f"Pipeline not found for update: {pipeline_id}")
            return False

        # Get existing data to preserve created_at
        existing = await self.get(pipeline_id)
        if existing:
            pipeline_data["created_at"] = existing.get("created_at")

        await self.save(pipeline_id, pipeline_data)
        return True
