"""Pipeline-related use cases."""

from typing import Dict, Any, List
import time


class ExecutePipelineUseCase:
    """Use case for executing a pipeline."""

    def __init__(self, execution_engine):
        self.execution_engine = execution_engine

    async def execute(self, pipeline_def: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a pipeline.

        Args:
            pipeline_def: Pipeline definition dictionary

        Returns:
            Execution result with node results and timing

        Raises:
            ValueError: If execution engine not initialized
        """
        if self.execution_engine is None:
            raise ValueError("Execution engine not initialized")

        start_time = time.time()

        try:
            result = await self.execution_engine.execute_pipeline(pipeline_def)
            execution_time = time.time() - start_time

            # Convert results to proper format
            node_results = {}
            for node_id, outputs in result.get("results", {}).items():
                node_results[node_id] = {
                    "node_id": node_id,
                    "status": "completed",
                    "outputs": outputs,
                    "error": None,
                    "execution_time": 0.0,
                }

            return {
                "success": result.get("success", True),
                "pipeline_id": pipeline_def.get("pipeline_id"),
                "execution_time": execution_time,
                "nodes_executed": result.get("nodes_executed", 0),
                "results": node_results,
                "error": result.get("error"),
            }
        except Exception as e:
            execution_time = time.time() - start_time
            return {
                "success": False,
                "pipeline_id": pipeline_def.get("pipeline_id"),
                "execution_time": execution_time,
                "nodes_executed": 0,
                "results": {},
                "error": str(e),
            }


class SavePipelineUseCase:
    """Use case for saving a pipeline."""

    def __init__(self, pipeline_repository):
        self.pipeline_repository = pipeline_repository

    async def execute(self, pipeline_def: Dict[str, Any]) -> Dict[str, Any]:
        """
        Save a pipeline to storage.

        Args:
            pipeline_def: Pipeline definition dictionary

        Returns:
            Save result with pipeline ID

        Raises:
            ValueError: If pipeline_id is missing or repository not initialized
        """
        if self.pipeline_repository is None:
            raise ValueError("Pipeline repository not initialized")

        pipeline_id = pipeline_def.get("pipeline_id")

        if not pipeline_id:
            raise ValueError("Pipeline ID is required")

        await self.pipeline_repository.save(pipeline_id, pipeline_def)

        return {
            "success": True,
            "pipeline_id": pipeline_id,
            "message": f"Pipeline '{pipeline_id}' saved successfully",
        }


class GetPipelineUseCase:
    """Use case for retrieving a pipeline."""

    def __init__(self, pipeline_repository):
        self.pipeline_repository = pipeline_repository

    async def execute(self, pipeline_id: str) -> Dict[str, Any]:
        """
        Get a pipeline by ID.

        Args:
            pipeline_id: Pipeline identifier

        Returns:
            Pipeline definition dictionary

        Raises:
            ValueError: If pipeline not found or repository not initialized
        """
        if self.pipeline_repository is None:
            raise ValueError("Pipeline repository not initialized")

        pipeline_data = await self.pipeline_repository.get(pipeline_id)

        if pipeline_data is None:
            raise ValueError(f"Pipeline '{pipeline_id}' not found")

        return pipeline_data


class ListPipelinesUseCase:
    """Use case for listing all pipelines."""

    def __init__(self, pipeline_repository):
        self.pipeline_repository = pipeline_repository

    async def execute(self) -> List[Dict[str, Any]]:
        """
        List all saved pipelines.

        Returns:
            List of pipeline metadata dictionaries

        Raises:
            ValueError: If repository not initialized
        """
        if self.pipeline_repository is None:
            raise ValueError("Pipeline repository not initialized")

        pipelines_meta = await self.pipeline_repository.list_all()
        return pipelines_meta


class DeletePipelineUseCase:
    """Use case for deleting a pipeline."""

    def __init__(self, pipeline_repository):
        self.pipeline_repository = pipeline_repository

    async def execute(self, pipeline_id: str) -> Dict[str, Any]:
        """
        Delete a pipeline by ID.

        Args:
            pipeline_id: Pipeline identifier

        Returns:
            Deletion result with status

        Raises:
            ValueError: If pipeline not found or repository not initialized
        """
        if self.pipeline_repository is None:
            raise ValueError("Pipeline repository not initialized")

        success = await self.pipeline_repository.delete(pipeline_id)

        if not success:
            raise ValueError(f"Pipeline '{pipeline_id}' not found")

        return {
            "success": True,
            "pipeline_id": pipeline_id,
            "message": f"Pipeline '{pipeline_id}' deleted successfully",
        }
