"""
API Exception Handlers - Convert domain exceptions to HTTP responses

This module provides FastAPI exception handlers that convert domain-specific
exceptions into appropriate HTTP responses with structured error messages.
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse
from typing import Dict, Any, Optional
import logging

from domain.exceptions import (
    DomainException,
    ValidationError,
    NotFoundError,
    AlreadyExistsError,
    InvalidStateError,
    ExecutionError,
    PipelineExecutionError,
    NodeExecutionError,
    CircularDependencyError,
    DeviceError,
    DeviceNotFoundError,
    DeviceConnectionError,
    DeviceFunctionError,
    PluginError,
    PluginNotFoundError,
    PluginLoadError,
    PluginConfigError,
    RepositoryError,
    PipelineNotFoundError,
    PipelineSaveError,
    PipelineDeleteError,
)

logger = logging.getLogger(__name__)


class ErrorResponse:
    """
    Structured error response model.

    Provides a consistent error response format across all API endpoints.
    """

    def __init__(
        self,
        error_type: str,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        request_id: Optional[str] = None
    ):
        """
        Initialize error response.

        Args:
            error_type: Type of error (e.g., "ValidationError")
            message: Human-readable error message
            details: Additional error context
            request_id: Request identifier for debugging
        """
        self.error_type = error_type
        self.message = message
        self.details = details or {}
        self.request_id = request_id

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON response."""
        response = {
            "error": {
                "type": self.error_type,
                "message": self.message,
            }
        }

        if self.details:
            response["error"]["details"] = self.details

        if self.request_id:
            response["error"]["request_id"] = self.request_id

        return response


def get_status_code_for_exception(exc: DomainException) -> int:
    """
    Map domain exception to HTTP status code.

    Args:
        exc: Domain exception

    Returns:
        HTTP status code
    """
    # Validation errors
    if isinstance(exc, ValidationError):
        return status.HTTP_400_BAD_REQUEST

    # Not found errors
    if isinstance(exc, (
        NotFoundError,
        DeviceNotFoundError,
        PluginNotFoundError,
        PipelineNotFoundError
    )):
        return status.HTTP_404_NOT_FOUND

    # Conflict errors (already exists)
    if isinstance(exc, AlreadyExistsError):
        return status.HTTP_409_CONFLICT

    # Invalid state errors
    if isinstance(exc, InvalidStateError):
        return status.HTTP_400_BAD_REQUEST

    # Execution errors (circular dependency is a client error)
    if isinstance(exc, CircularDependencyError):
        return status.HTTP_400_BAD_REQUEST

    # Other execution errors are server errors
    if isinstance(exc, ExecutionError):
        return status.HTTP_500_INTERNAL_SERVER_ERROR

    # Device connection errors
    if isinstance(exc, DeviceConnectionError):
        return status.HTTP_503_SERVICE_UNAVAILABLE

    # Device function errors
    if isinstance(exc, DeviceFunctionError):
        return status.HTTP_500_INTERNAL_SERVER_ERROR

    # Plugin load errors
    if isinstance(exc, PluginLoadError):
        return status.HTTP_500_INTERNAL_SERVER_ERROR

    # Plugin config errors
    if isinstance(exc, PluginConfigError):
        return status.HTTP_400_BAD_REQUEST

    # Repository save/delete errors
    if isinstance(exc, (PipelineSaveError, PipelineDeleteError)):
        return status.HTTP_500_INTERNAL_SERVER_ERROR

    # Default: internal server error
    return status.HTTP_500_INTERNAL_SERVER_ERROR


async def domain_exception_handler(request: Request, exc: DomainException) -> JSONResponse:
    """
    Handle domain exceptions and convert to HTTP responses.

    Args:
        request: FastAPI request
        exc: Domain exception

    Returns:
        JSON response with error details
    """
    # Get appropriate status code
    status_code = get_status_code_for_exception(exc)

    # Create error response
    error_response = ErrorResponse(
        error_type=exc.__class__.__name__,
        message=exc.message,
        details=exc.details,
        request_id=None  # Could add request ID tracking later
    )

    # Log the error
    if status_code >= 500:
        # Server errors - log with ERROR level
        logger.error(
            f"Server error during {request.method} {request.url.path}: "
            f"{exc.__class__.__name__}: {exc.message}",
            extra={
                "error_type": exc.__class__.__name__,
                "details": exc.details,
                "path": str(request.url.path),
                "method": request.method,
            }
        )
    else:
        # Client errors - log with WARNING level
        logger.warning(
            f"Client error during {request.method} {request.url.path}: "
            f"{exc.__class__.__name__}: {exc.message}",
            extra={
                "error_type": exc.__class__.__name__,
                "details": exc.details,
                "path": str(request.url.path),
                "method": request.method,
            }
        )

    return JSONResponse(
        status_code=status_code,
        content=error_response.to_dict()
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Handle generic exceptions that weren't caught by domain exception handler.

    Args:
        request: FastAPI request
        exc: Generic exception

    Returns:
        JSON response with error details
    """
    # Log the unexpected error
    logger.error(
        f"Unexpected error during {request.method} {request.url.path}: {str(exc)}",
        exc_info=True,
        extra={
            "error_type": exc.__class__.__name__,
            "path": str(request.url.path),
            "method": request.method,
        }
    )

    # Create generic error response (don't expose internal details in production)
    error_response = ErrorResponse(
        error_type="InternalServerError",
        message="An unexpected error occurred. Please try again later.",
        details={"error_class": exc.__class__.__name__}  # Only in development
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response.to_dict()
    )


def register_exception_handlers(app):
    """
    Register all exception handlers with FastAPI app.

    Args:
        app: FastAPI application instance
    """
    # Register domain exception handler
    app.add_exception_handler(DomainException, domain_exception_handler)

    # Register generic exception handler as fallback
    app.add_exception_handler(Exception, generic_exception_handler)

    logger.info("Exception handlers registered")
