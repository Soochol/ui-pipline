"""
Domain Exception Layer - Custom exception hierarchy for UI Pipeline System

This module defines domain-specific exceptions that provide better error handling,
error messages, and error context throughout the application.

Exception Hierarchy:
    DomainException (base)
    ├── ValidationError
    ├── NotFoundError
    ├── AlreadyExistsError
    ├── InvalidStateError
    ├── ExecutionError
    │   ├── PipelineExecutionError
    │   ├── NodeExecutionError
    │   └── CircularDependencyError
    ├── DeviceError
    │   ├── DeviceNotFoundError
    │   ├── DeviceConnectionError
    │   └── DeviceFunctionError
    └── PluginError
        ├── PluginNotFoundError
        ├── PluginLoadError
        └── PluginConfigError
"""

from typing import Optional, Dict, Any


class DomainException(Exception):
    """
    Base exception for all domain-specific errors.

    All domain exceptions should inherit from this class to enable
    consistent error handling and logging.
    """

    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        cause: Optional[Exception] = None
    ):
        """
        Initialize domain exception.

        Args:
            message: Human-readable error message
            details: Additional context about the error
            cause: Original exception that caused this error (if any)
        """
        super().__init__(message)
        self.message = message
        self.details = details or {}
        self.cause = cause

    def __str__(self) -> str:
        """String representation of the exception."""
        if self.details:
            details_str = ", ".join(f"{k}={v}" for k, v in self.details.items())
            return f"{self.message} ({details_str})"
        return self.message

    def to_dict(self) -> Dict[str, Any]:
        """Convert exception to dictionary for serialization."""
        return {
            "type": self.__class__.__name__,
            "message": self.message,
            "details": self.details,
        }


# ============================================================================
# Validation Errors
# ============================================================================

class ValidationError(DomainException):
    """Raised when validation fails (invalid input, configuration, etc.)."""

    def __init__(self, message: str, field: Optional[str] = None, **kwargs):
        details = kwargs.get('details', {})
        if field:
            details['field'] = field
        super().__init__(message, details=details, cause=kwargs.get('cause'))


# ============================================================================
# Resource Not Found Errors
# ============================================================================

class NotFoundError(DomainException):
    """Base class for resource not found errors."""

    def __init__(self, resource_type: str, resource_id: str, **kwargs):
        message = f"{resource_type} '{resource_id}' not found"
        details = {'resource_type': resource_type, 'resource_id': resource_id}
        details.update(kwargs.get('details', {}))
        super().__init__(message, details=details, cause=kwargs.get('cause'))


# ============================================================================
# Resource Already Exists Errors
# ============================================================================

class AlreadyExistsError(DomainException):
    """Raised when trying to create a resource that already exists."""

    def __init__(self, resource_type: str, resource_id: str, **kwargs):
        message = f"{resource_type} '{resource_id}' already exists"
        details = {'resource_type': resource_type, 'resource_id': resource_id}
        details.update(kwargs.get('details', {}))
        super().__init__(message, details=details, cause=kwargs.get('cause'))


# ============================================================================
# Invalid State Errors
# ============================================================================

class InvalidStateError(DomainException):
    """Raised when an operation is attempted in an invalid state."""

    def __init__(self, message: str, current_state: Optional[str] = None, **kwargs):
        details = kwargs.get('details', {})
        if current_state:
            details['current_state'] = current_state
        super().__init__(message, details=details, cause=kwargs.get('cause'))


# ============================================================================
# Execution Errors
# ============================================================================

class ExecutionError(DomainException):
    """Base class for execution-related errors."""
    pass


class PipelineExecutionError(ExecutionError):
    """Raised when pipeline execution fails."""

    def __init__(self, pipeline_id: str, message: str, **kwargs):
        details = {'pipeline_id': pipeline_id}
        details.update(kwargs.get('details', {}))
        super().__init__(message, details=details, cause=kwargs.get('cause'))


class NodeExecutionError(ExecutionError):
    """Raised when a specific node execution fails."""

    def __init__(
        self,
        node_id: str,
        node_label: str,
        message: str,
        **kwargs
    ):
        details = {
            'node_id': node_id,
            'node_label': node_label,
        }
        details.update(kwargs.get('details', {}))
        super().__init__(message, details=details, cause=kwargs.get('cause'))


class CircularDependencyError(ExecutionError):
    """Raised when a circular dependency is detected in the pipeline."""

    def __init__(self, cycle: list, **kwargs):
        message = f"Circular dependency detected: {' -> '.join(cycle)}"
        details = {'cycle': cycle}
        details.update(kwargs.get('details', {}))
        super().__init__(message, details=details, cause=kwargs.get('cause'))


# ============================================================================
# Device Errors
# ============================================================================

class DeviceError(DomainException):
    """Base class for device-related errors."""
    pass


class DeviceNotFoundError(DeviceError, NotFoundError):
    """Raised when a device instance is not found."""

    def __init__(self, instance_id: str, **kwargs):
        NotFoundError.__init__(
            self,
            resource_type="Device",
            resource_id=instance_id,
            **kwargs
        )


class DeviceConnectionError(DeviceError):
    """Raised when device connection fails."""

    def __init__(self, instance_id: str, message: str, **kwargs):
        details = {'instance_id': instance_id}
        details.update(kwargs.get('details', {}))
        super().__init__(message, details=details, cause=kwargs.get('cause'))


class DeviceFunctionError(DeviceError):
    """Raised when device function execution fails."""

    def __init__(
        self,
        instance_id: str,
        function_id: str,
        message: str,
        **kwargs
    ):
        details = {
            'instance_id': instance_id,
            'function_id': function_id,
        }
        details.update(kwargs.get('details', {}))
        super().__init__(message, details=details, cause=kwargs.get('cause'))


# ============================================================================
# Plugin Errors
# ============================================================================

class PluginError(DomainException):
    """Base class for plugin-related errors."""
    pass


class PluginNotFoundError(PluginError, NotFoundError):
    """Raised when a plugin is not found."""

    def __init__(self, plugin_id: str, **kwargs):
        NotFoundError.__init__(
            self,
            resource_type="Plugin",
            resource_id=plugin_id,
            **kwargs
        )


class PluginLoadError(PluginError):
    """Raised when plugin loading fails."""

    def __init__(self, plugin_id: str, message: str, **kwargs):
        details = {'plugin_id': plugin_id}
        details.update(kwargs.get('details', {}))
        super().__init__(message, details=details, cause=kwargs.get('cause'))


class PluginConfigError(PluginError):
    """Raised when plugin configuration is invalid."""

    def __init__(self, plugin_id: str, message: str, **kwargs):
        details = {'plugin_id': plugin_id}
        details.update(kwargs.get('details', {}))
        super().__init__(message, details=details, cause=kwargs.get('cause'))


# ============================================================================
# Repository Errors
# ============================================================================

class RepositoryError(DomainException):
    """Base class for repository-related errors."""
    pass


class PipelineNotFoundError(RepositoryError, NotFoundError):
    """Raised when a pipeline is not found in the repository."""

    def __init__(self, pipeline_id: str, **kwargs):
        NotFoundError.__init__(
            self,
            resource_type="Pipeline",
            resource_id=pipeline_id,
            **kwargs
        )


class PipelineSaveError(RepositoryError):
    """Raised when saving a pipeline fails."""

    def __init__(self, pipeline_id: str, message: str, **kwargs):
        details = {'pipeline_id': pipeline_id}
        details.update(kwargs.get('details', {}))
        super().__init__(message, details=details, cause=kwargs.get('cause'))


class PipelineDeleteError(RepositoryError):
    """Raised when deleting a pipeline fails."""

    def __init__(self, pipeline_id: str, message: str, **kwargs):
        details = {'pipeline_id': pipeline_id}
        details.update(kwargs.get('details', {}))
        super().__init__(message, details=details, cause=kwargs.get('cause'))
