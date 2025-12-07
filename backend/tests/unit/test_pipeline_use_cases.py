"""Unit tests for pipeline use cases."""

import pytest
from unittest.mock import Mock, AsyncMock
from domain.use_cases.pipeline_use_cases import (
    ExecutePipelineUseCase,
    SavePipelineUseCase,
    GetPipelineUseCase,
    ListPipelinesUseCase,
    DeletePipelineUseCase,
)


@pytest.mark.asyncio
async def test_execute_pipeline_use_case_success():
    """Test executing a pipeline successfully."""
    # Arrange
    mock_engine = Mock()
    mock_engine.execute_pipeline = AsyncMock(return_value={
        "success": True,
        "results": {"node1": {"output": "value"}},
        "nodes_executed": 1,
    })
    use_case = ExecutePipelineUseCase(mock_engine)
    
    pipeline_def = {
        "pipeline_id": "pipeline1",
        "name": "Test Pipeline",
        "nodes": [],
        "edges": [],
    }

    # Act
    result = await use_case.execute(pipeline_def)

    # Assert
    assert result["success"] is True
    assert result["pipeline_id"] == "pipeline1"
    assert "execution_time" in result
    mock_engine.execute_pipeline.assert_called_once_with(pipeline_def)


@pytest.mark.asyncio
async def test_execute_pipeline_use_case_error():
    """Test executing a pipeline with error."""
    # Arrange
    mock_engine = Mock()
    mock_engine.execute_pipeline = AsyncMock(side_effect=Exception("Pipeline error"))
    use_case = ExecutePipelineUseCase(mock_engine)
    
    pipeline_def = {"pipeline_id": "pipeline1"}

    # Act
    result = await use_case.execute(pipeline_def)

    # Assert
    assert result["success"] is False
    assert "Pipeline error" in result["error"]


@pytest.mark.asyncio
async def test_save_pipeline_use_case():
    """Test saving a pipeline."""
    # Arrange
    mock_repository = Mock()
    mock_repository.save = AsyncMock()
    use_case = SavePipelineUseCase(mock_repository)
    
    pipeline_def = {
        "pipeline_id": "pipeline1",
        "name": "Test Pipeline",
    }

    # Act
    result = await use_case.execute(pipeline_def)

    # Assert
    assert result["success"] is True
    assert result["pipeline_id"] == "pipeline1"
    mock_repository.save.assert_called_once_with("pipeline1", pipeline_def)


@pytest.mark.asyncio
async def test_save_pipeline_use_case_no_id():
    """Test saving a pipeline without ID."""
    # Arrange
    mock_repository = Mock()
    use_case = SavePipelineUseCase(mock_repository)
    
    pipeline_def = {"name": "Test Pipeline"}

    # Act & Assert
    with pytest.raises(ValueError, match="Pipeline ID is required"):
        await use_case.execute(pipeline_def)


@pytest.mark.asyncio
async def test_get_pipeline_use_case():
    """Test getting a pipeline."""
    # Arrange
    mock_repository = Mock()
    mock_repository.get = AsyncMock(return_value={"pipeline_id": "pipeline1"})
    use_case = GetPipelineUseCase(mock_repository)

    # Act
    result = await use_case.execute("pipeline1")

    # Assert
    assert result["pipeline_id"] == "pipeline1"
    mock_repository.get.assert_called_once_with("pipeline1")


@pytest.mark.asyncio
async def test_get_pipeline_use_case_not_found():
    """Test getting a non-existent pipeline."""
    # Arrange
    mock_repository = Mock()
    mock_repository.get = AsyncMock(return_value=None)
    use_case = GetPipelineUseCase(mock_repository)

    # Act & Assert
    with pytest.raises(ValueError, match="Pipeline 'pipeline1' not found"):
        await use_case.execute("pipeline1")


@pytest.mark.asyncio
async def test_list_pipelines_use_case():
    """Test listing pipelines."""
    # Arrange
    mock_repository = Mock()
    mock_repository.list_all = AsyncMock(return_value=[
        {"id": "pipeline1", "name": "Pipeline 1"},
        {"id": "pipeline2", "name": "Pipeline 2"},
    ])
    use_case = ListPipelinesUseCase(mock_repository)

    # Act
    result = await use_case.execute()

    # Assert
    assert len(result) == 2
    assert result[0]["id"] == "pipeline1"
    mock_repository.list_all.assert_called_once()


@pytest.mark.asyncio
async def test_delete_pipeline_use_case():
    """Test deleting a pipeline."""
    # Arrange
    mock_repository = Mock()
    mock_repository.delete = AsyncMock(return_value=True)
    use_case = DeletePipelineUseCase(mock_repository)

    # Act
    result = await use_case.execute("pipeline1")

    # Assert
    assert result["success"] is True
    assert result["pipeline_id"] == "pipeline1"
    mock_repository.delete.assert_called_once_with("pipeline1")


@pytest.mark.asyncio
async def test_delete_pipeline_use_case_not_found():
    """Test deleting a non-existent pipeline."""
    # Arrange
    mock_repository = Mock()
    mock_repository.delete = AsyncMock(return_value=False)
    use_case = DeletePipelineUseCase(mock_repository)

    # Act & Assert
    with pytest.raises(ValueError, match="Pipeline 'pipeline1' not found"):
        await use_case.execute("pipeline1")
