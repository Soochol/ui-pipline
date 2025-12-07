# API Exception Handler - Completion Report

**Date:** 2024-12-07
**Phase:** Backend Priority 4 - API Exception Handler
**Status:** ✅ COMPLETED

---

## 📋 Overview

This document details the implementation of a comprehensive API Exception Handler for the UI Pipeline System backend. The exception handler automatically converts domain-specific exceptions into proper HTTP responses with structured error messages, providing a consistent API error format across all endpoints.

---

## 🎯 Objectives

1. ✅ Create FastAPI exception handler for domain exceptions
2. ✅ Map domain exceptions to appropriate HTTP status codes
3. ✅ Define structured error response model
4. ✅ Implement logging for errors (client vs server)
5. ✅ Register exception handlers in FastAPI app
6. ✅ Handle both domain and generic exceptions

---

## 🚀 Implemented Features

### 1. Exception Handler Module ([api/exceptions.py](c:\code\ui-pipline\backend\api\exceptions.py))

**Core Components:**

**ErrorResponse Class:**
```python
class ErrorResponse:
    """Structured error response model."""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error": {
                "type": self.error_type,
                "message": self.message,
                "details": self.details,  # Optional
                "request_id": self.request_id,  # Optional
            }
        }
```

**Status Code Mapping Function:**
```python
def get_status_code_for_exception(exc: DomainException) -> int:
    """Map domain exception to HTTP status code."""
    # ValidationError → 400 Bad Request
    # NotFoundError → 404 Not Found
    # AlreadyExistsError → 409 Conflict
    # CircularDependencyError → 400 Bad Request
    # ExecutionError → 500 Internal Server Error
    # DeviceConnectionError → 503 Service Unavailable
    # etc.
```

**Domain Exception Handler:**
```python
async def domain_exception_handler(request: Request, exc: DomainException) -> JSONResponse:
    """Handle domain exceptions and convert to HTTP responses."""

    # Get appropriate status code
    status_code = get_status_code_for_exception(exc)

    # Create structured error response
    error_response = ErrorResponse(
        error_type=exc.__class__.__name__,
        message=exc.message,
        details=exc.details
    )

    # Log based on severity (500+ = ERROR, <500 = WARNING)
    if status_code >= 500:
        logger.error(f"Server error: {exc.__class__.__name__}: {exc.message}")
    else:
        logger.warning(f"Client error: {exc.__class__.__name__}: {exc.message}")

    return JSONResponse(status_code=status_code, content=error_response.to_dict())
```

**Generic Exception Handler (Fallback):**
```python
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""

    logger.error(f"Unexpected error: {str(exc)}", exc_info=True)

    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "type": "InternalServerError",
                "message": "An unexpected error occurred. Please try again later.",
                "details": {"error_class": exc.__class__.__name__}
            }
        }
    )
```

---

### 2. HTTP Status Code Mapping

| Exception Type | HTTP Status | Reason |
|----------------|-------------|--------|
| `ValidationError` | 400 Bad Request | Invalid input/configuration |
| `NotFoundError` | 404 Not Found | Resource not found |
| `DeviceNotFoundError` | 404 Not Found | Device not found |
| `PluginNotFoundError` | 404 Not Found | Plugin not found |
| `PipelineNotFoundError` | 404 Not Found | Pipeline not found |
| `AlreadyExistsError` | 409 Conflict | Resource already exists |
| `InvalidStateError` | 400 Bad Request | Invalid operation state |
| `CircularDependencyError` | 400 Bad Request | Invalid pipeline structure |
| `DeviceConnectionError` | 503 Service Unavailable | Device not available |
| `DeviceFunctionError` | 500 Internal Server Error | Function execution failed |
| `ExecutionError` | 500 Internal Server Error | Pipeline execution failed |
| `PluginLoadError` | 500 Internal Server Error | Plugin loading failed |
| `PluginConfigError` | 400 Bad Request | Invalid plugin config |
| `PipelineSaveError` | 500 Internal Server Error | Save operation failed |
| `PipelineDeleteError` | 500 Internal Server Error | Delete operation failed |

---

### 3. Error Response Format

**Success Response:**
```json
{
  "success": true,
  "pipeline_id": "my-pipeline",
  "execution_time": 181.5,
  "nodes_executed": 3
}
```

**Error Response (Client Error - 400):**
```json
{
  "error": {
    "type": "CircularDependencyError",
    "message": "Circular dependency detected: node_1 -> node_2 -> node_3 -> node_1",
    "details": {
      "cycle": ["node_1", "node_2", "node_3", "node_1"],
      "all_cycles": [["node_1", "node_2", "node_3", "node_1"]]
    }
  }
}
```

**Error Response (Not Found - 404):**
```json
{
  "error": {
    "type": "DeviceNotFoundError",
    "message": "Device 'servo_99' not found",
    "details": {
      "resource_type": "Device",
      "resource_id": "servo_99"
    }
  }
}
```

**Error Response (Server Error - 500):**
```json
{
  "error": {
    "type": "PipelineExecutionError",
    "message": "Failed to execute pipeline: Node validation failed",
    "details": {
      "pipeline_id": "my-pipeline",
      "error": "Invalid node configuration"
    }
  }
}
```

---

### 4. Logging Strategy

**Client Errors (4xx) - WARNING Level:**
```python
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
```

**Server Errors (5xx) - ERROR Level:**
```python
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
```

**Unexpected Errors - ERROR Level with Stack Trace:**
```python
logger.error(
    f"Unexpected error during {request.method} {request.url.path}: {str(exc)}",
    exc_info=True,  # ✅ Includes full stack trace
    extra={
        "error_type": exc.__class__.__name__,
        "path": str(request.url.path),
        "method": request.method,
    }
)
```

---

### 5. Application Integration ([main.py](c:\code\ui-pipline\backend\main.py))

**Import Exception Handler:**
```python
from api.exceptions import register_exception_handlers
```

**Register Handlers:**
```python
# Create FastAPI app
app = FastAPI(...)

# Configure CORS
app.add_middleware(CORSMiddleware, ...)

# Register exception handlers
register_exception_handlers(app)  # ✅ Registers all handlers

# Include routers
app.include_router(router, prefix=settings.API_PREFIX)
```

**Handler Registration:**
```python
def register_exception_handlers(app):
    """Register all exception handlers with FastAPI app."""

    # Domain exception handler (catches all DomainException subclasses)
    app.add_exception_handler(DomainException, domain_exception_handler)

    # Generic exception handler (fallback for unexpected errors)
    app.add_exception_handler(Exception, generic_exception_handler)

    logger.info("Exception handlers registered")
```

---

## 📊 Metrics

### Code Changes

| File | Type | Lines Added | Purpose |
|------|------|-------------|---------|
| api/exceptions.py | New | 260 | Exception handlers and error response model |
| main.py | Modified | +3 | Register exception handlers |

**Total:** ~263 lines of new/modified code

### Features Delivered

| Feature | Status | Impact |
|---------|--------|--------|
| Structured Error Responses | ✅ | High - Consistent API error format |
| Status Code Mapping | ✅ | High - Proper HTTP semantics |
| Error Logging | ✅ | High - Debugging and monitoring |
| Generic Exception Handler | ✅ | High - Handles unexpected errors |
| Request Context Logging | ✅ | Medium - Better debugging |

---

## 🎨 Benefits Achieved

### 1. **Consistent API Error Format**

**Before:**
```json
HTTP 500 Internal Server Error
{
  "detail": "Node 'node_1' not found in pipeline definition"
}
```

**After:**
```json
HTTP 404 Not Found
{
  "error": {
    "type": "NodeExecutionError",
    "message": "Node 'node_1' not found in pipeline definition",
    "details": {
      "node_id": "node_1",
      "node_label": "Unknown"
    }
  }
}
```

### 2. **Proper HTTP Status Codes**

- ✅ 400 for client errors (validation, circular dependency)
- ✅ 404 for not found errors
- ✅ 409 for conflicts (already exists)
- ✅ 500 for server errors (execution failures)
- ✅ 503 for service unavailable (device disconnected)

### 3. **Rich Error Context**

Every error response includes:
- `type`: Exception class name
- `message`: Human-readable description
- `details`: Structured context (dict)
- `request_id`: (Optional) Request tracking

### 4. **Better Logging**

**Client Error Log:**
```
WARNING - Client error during POST /api/pipelines/execute: CircularDependencyError: Circular dependency detected: node_1 -> node_2 -> node_1
```

**Server Error Log:**
```
ERROR - Server error during POST /api/devices/function: DeviceFunctionError: Function execution failed: Connection timeout
```

---

## 📁 Files Created

### New Files (1):
1. [backend/api/exceptions.py](c:\code\ui-pipline\backend\api\exceptions.py) - Exception handlers and error response model

### Modified Files (1):
1. [backend/main.py](c:\code\ui-pipline\backend\main.py) - Register exception handlers

---

## ✅ Success Criteria Met

- [x] FastAPI exception handler for DomainException
- [x] HTTP status code mapping (15 exception types)
- [x] Structured ErrorResponse model
- [x] Logging based on severity (WARNING vs ERROR)
- [x] Generic exception handler for unexpected errors
- [x] Exception handlers registered in FastAPI app
- [x] Server starts successfully with handlers

---

## 🔄 Example Scenarios

### Scenario 1: Device Not Found (404)

**Request:**
```http
POST /api/devices/function
{
  "instance_id": "servo_99",
  "function_id": "home",
  "inputs": {}
}
```

**Response:**
```json
HTTP 404 Not Found
{
  "error": {
    "type": "DeviceNotFoundError",
    "message": "Device 'servo_99' not found",
    "details": {
      "resource_type": "Device",
      "resource_id": "servo_99"
    }
  }
}
```

**Log:**
```
WARNING - Client error during POST /api/devices/function: DeviceNotFoundError: Device 'servo_99' not found
```

---

### Scenario 2: Circular Dependency (400)

**Request:**
```http
POST /api/pipelines/execute
{
  "pipeline": {
    "nodes": [...],
    "edges": [
      {"source": "node_1", "target": "node_2"},
      {"source": "node_2", "target": "node_3"},
      {"source": "node_3", "target": "node_1"}  // ❌ Cycle!
    ]
  }
}
```

**Response:**
```json
HTTP 400 Bad Request
{
  "error": {
    "type": "CircularDependencyError",
    "message": "Circular dependency detected: node_1 -> node_2 -> node_3 -> node_1",
    "details": {
      "cycle": ["node_1", "node_2", "node_3", "node_1"],
      "all_cycles": [["node_1", "node_2", "node_3", "node_1"]]
    }
  }
}
```

**Log:**
```
WARNING - Client error during POST /api/pipelines/execute: CircularDependencyError: Circular dependency detected
```

---

### Scenario 3: Function Execution Failed (500)

**Request:**
```http
POST /api/devices/function
{
  "instance_id": "servo_1",
  "function_id": "move_absolute",
  "inputs": {"target": 9999}  // Out of range
}
```

**Response:**
```json
HTTP 500 Internal Server Error
{
  "error": {
    "type": "DeviceFunctionError",
    "message": "Function execution failed: Target position out of range",
    "details": {
      "instance_id": "servo_1",
      "function_id": "move_absolute"
    }
  }
}
```

**Log:**
```
ERROR - Server error during POST /api/devices/function: DeviceFunctionError: Function execution failed
```

---

### Scenario 4: Device Already Exists (409)

**Request:**
```http
POST /api/devices
{
  "plugin_id": "mock_servo",
  "instance_id": "servo_1",  // Already exists
  "config": {}
}
```

**Response:**
```json
HTTP 409 Conflict
{
  "error": {
    "type": "AlreadyExistsError",
    "message": "Device instance 'servo_1' already exists",
    "details": {
      "resource_type": "Device instance",
      "resource_id": "servo_1"
    }
  }
}
```

**Log:**
```
WARNING - Client error during POST /api/devices: AlreadyExistsError: Device instance 'servo_1' already exists
```

---

## 🐛 Known Limitations

1. **No Request ID Tracking**
   - ErrorResponse has `request_id` field but not populated yet
   - **Future:** Add middleware to generate and track request IDs

2. **No Retry-After Header**
   - 503 responses (DeviceConnectionError) should include Retry-After header
   - **Future:** Add retry logic hints

3. **Production vs Development Mode**
   - Generic exception handler includes error_class in details (development only)
   - **Future:** Hide internal details in production

4. **No Error Codes**
   - Errors don't have unique codes (e.g., `DEVICE_001`)
   - **Future:** Add error code system

---

## 🚀 Benefits for Frontend

### 1. **Structured Error Handling**

```typescript
try {
  await executePipeline({ nodes, edges });
} catch (error: any) {
  const errorData = error.response?.data?.error;

  if (errorData?.type === 'CircularDependencyError') {
    showError(`Circular dependency detected: ${errorData.details.cycle.join(' -> ')}`);
  } else if (errorData?.type === 'DeviceNotFoundError') {
    showError(`Device '${errorData.details.resource_id}' not found`);
  } else {
    showError(errorData?.message || 'Unknown error');
  }
}
```

### 2. **User-Friendly Error Messages**

Frontend can display detailed, actionable error messages:
- "Circular dependency detected: node_1 → node_2 → node_1"
- "Device 'servo_99' not found"
- "Function 'invalid_func' not found. Available functions: home, move_absolute, get_position"

### 3. **Error Type Discrimination**

Frontend can handle different error types differently:
- 404 → Show "Not found" message
- 409 → Show "Already exists, use different name"
- 400 → Show validation error
- 500 → Show "Server error, try again later"

---

## 🏆 Conclusion

The API Exception Handler is **complete and functional**. All domain exceptions are now automatically converted to proper HTTP responses with structured error messages.

**Key Achievements:**
- ✅ FastAPI exception handler for all domain exceptions
- ✅ HTTP status code mapping (15 exception types)
- ✅ Structured ErrorResponse with type, message, details
- ✅ Smart logging (WARNING for client errors, ERROR for server errors)
- ✅ Generic exception handler for unexpected errors
- ✅ Integrated with FastAPI app

**Phase Status:** COMPLETE

**Next Priority:** Use Case Layer 분리 또는 프론트엔드 기능 추가

---

**Document Version:** 1.0
**Last Updated:** 2024-12-07
