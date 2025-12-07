"""Composite Node API routes."""

from fastapi import APIRouter, HTTPException, Depends, Query
from dependency_injector.wiring import inject, Provide
from typing import Optional

from api.models import (
    CompositeCreateRequest,
    CompositeCreateFromNodesRequest,
    CompositeUpdateRequest,
    CompositeResponse,
    CompositeListResponse,
    CompositeGetResponse,
    CompositeDeleteResponse,
    CompositeMetadata,
)
from domain.use_cases.composite_use_cases import (
    ListCompositesUseCase,
    GetCompositeUseCase,
    CreateCompositeUseCase,
    UpdateCompositeUseCase,
    DeleteCompositeUseCase,
    CreateCompositeFromNodesUseCase,
)
from infrastructure.di_container import Container

router = APIRouter(prefix="/composites", tags=["composites"])


@router.get("", response_model=CompositeListResponse)
@inject
async def list_composites(
    category: Optional[str] = Query(None, description="Filter by category"),
    use_case: ListCompositesUseCase = Depends(
        Provide[Container.list_composites_use_case]
    ),
):
    """List all saved composite nodes."""
    try:
        composites_meta = await use_case.execute(category=category)

        composites = [
            CompositeMetadata(
                id=c.get("id", c.get("composite_id", "")),
                name=c.get("name", ""),
                category=c.get("category", "Composite"),
                color=c.get("color", "#9b59b6"),
                version=c.get("version", "1.0.0"),
                author=c.get("author", ""),
                input_count=c.get("input_count", 0),
                output_count=c.get("output_count", 0),
                created_at=c.get("created_at"),
                updated_at=c.get("updated_at"),
            )
            for c in composites_meta
        ]

        return CompositeListResponse(composites=composites, count=len(composites))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to list composites: {str(e)}"
        )


@router.get("/{composite_id}", response_model=CompositeGetResponse)
@inject
async def get_composite(
    composite_id: str,
    use_case: GetCompositeUseCase = Depends(
        Provide[Container.get_composite_use_case]
    ),
):
    """Get a specific composite by ID."""
    try:
        composite_data = await use_case.execute(composite_id)
        return CompositeGetResponse(composite=composite_data)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get composite: {str(e)}"
        )


@router.post("", response_model=CompositeResponse)
@inject
async def create_composite(
    request: CompositeCreateRequest,
    use_case: CreateCompositeUseCase = Depends(
        Provide[Container.create_composite_use_case]
    ),
):
    """Create a new composite node."""
    try:
        composite_data = {
            "composite_id": request.composite.composite_id,
            "name": request.composite.name,
            "description": request.composite.description,
            "subgraph": request.composite.subgraph.model_dump(),
            "inputs": [inp.model_dump() for inp in request.composite.inputs],
            "outputs": [out.model_dump() for out in request.composite.outputs],
            "category": request.composite.category,
            "color": request.composite.color,
            "author": request.composite.author,
            "version": request.composite.version,
        }

        result = await use_case.execute(composite_data)
        return CompositeResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create composite: {str(e)}"
        )


@router.post("/from-nodes", response_model=CompositeResponse)
@inject
async def create_composite_from_nodes(
    request: CompositeCreateFromNodesRequest,
    use_case: CreateCompositeFromNodesUseCase = Depends(
        Provide[Container.create_composite_from_nodes_use_case]
    ),
):
    """Create a composite from selected nodes."""
    try:
        result = await use_case.execute(
            name=request.name,
            nodes=request.nodes,
            edges=request.edges,
            external_edges=request.external_edges,
        )
        return CompositeResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to create composite from nodes: {str(e)}"
        )


@router.put("/{composite_id}", response_model=CompositeResponse)
@inject
async def update_composite(
    composite_id: str,
    request: CompositeUpdateRequest,
    use_case: UpdateCompositeUseCase = Depends(
        Provide[Container.update_composite_use_case]
    ),
):
    """Update an existing composite."""
    try:
        composite_data = {
            "name": request.composite.name,
            "description": request.composite.description,
            "subgraph": request.composite.subgraph.model_dump(),
            "inputs": [inp.model_dump() for inp in request.composite.inputs],
            "outputs": [out.model_dump() for out in request.composite.outputs],
            "category": request.composite.category,
            "color": request.composite.color,
            "author": request.composite.author,
            "version": request.composite.version,
        }

        result = await use_case.execute(composite_id, composite_data)
        return CompositeResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to update composite: {str(e)}"
        )


@router.delete("/{composite_id}", response_model=CompositeDeleteResponse)
@inject
async def delete_composite(
    composite_id: str,
    use_case: DeleteCompositeUseCase = Depends(
        Provide[Container.delete_composite_use_case]
    ),
):
    """Delete a composite."""
    try:
        result = await use_case.execute(composite_id)
        return CompositeDeleteResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to delete composite: {str(e)}"
        )
