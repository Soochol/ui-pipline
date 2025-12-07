"""Repository interfaces for domain models."""

from .pipeline_repository import IPipelineRepository
from .composite_repository import ICompositeRepository

__all__ = ['IPipelineRepository', 'ICompositeRepository']
