# 실행 엔진 (Execution Engine)

## 1. 개요

실행 엔진은 파이프라인 정의(JSON)를 받아서 노드를 실행하고 데이터를 흘려보내는 핵심 컴포넌트입니다.

## 2. 실행 흐름

```
Pipeline JSON
    ↓
Execution Engine
    ├─ 1. Graph 생성 (노드/엣지)
    ├─ 2. 토폴로지 정렬 (실행 순서)
    ├─ 3. 데이터 저장소 초기화
    ├─ 4. 노드 순차 실행
    │      ├─ 입력 수집 (이전 노드 출력)
    │      ├─ 플러그인 함수 호출
    │      └─ 출력 저장
    └─ 5. 결과 반환
```

## 3. ExecutionEngine 클래스

### 3.1 전체 구조

```python
# core/execution_engine.py

from typing import Dict, Any, List, Optional, AsyncGenerator
import asyncio
from collections import deque
import networkx as nx
import logging
import time

logger = logging.getLogger(__name__)

class ExecutionEngine:
    """
    파이프라인 실행 엔진
    """

    def __init__(self, device_manager, plugin_loader):
        self.device_manager = device_manager
        self.plugin_loader = plugin_loader

        # 실행 상태
        self.data_store: Dict[str, Dict[str, Any]] = {}
        self.execution_state: Dict[str, str] = {}
        self.global_vars: Dict[str, Any] = {}

        # 성능 측정
        self.execution_times: Dict[str, float] = {}

    async def execute_pipeline(
        self,
        pipeline_def: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        파이프라인 실행 (블로킹)

        Args:
            pipeline_def: {
                "nodes": [...],
                "edges": [...],
                "variables": {...}
            }

        Returns:
            {
                "status": "completed" | "error",
                "data_store": {...},
                "execution_times": {...}
            }
        """
        logger.info(f"Starting pipeline execution: {pipeline_def.get('name', 'Unnamed')}")

        try:
            # 1. 실행 그래프 생성
            graph = self._build_execution_graph(pipeline_def)

            # 2. 토폴로지 정렬
            execution_order = list(nx.topological_sort(graph))

            logger.info(f"Execution order: {execution_order}")

            # 3. 초기화
            self.data_store = {}
            self.execution_state = {
                node_id: "pending"
                for node_id in execution_order
            }
            self.execution_times = {}
            self.global_vars = pipeline_def.get('variables', {}).get('global', {})

            # 4. 노드 실행
            for node_id in execution_order:
                await self._execute_node(node_id, pipeline_def)

            logger.info("Pipeline execution completed")

            return {
                "status": "completed",
                "data_store": self.data_store,
                "execution_times": self.execution_times,
                "variables": self.global_vars
            }

        except Exception as e:
            logger.error(f"Pipeline execution failed: {e}")
            return {
                "status": "error",
                "error": str(e),
                "data_store": self.data_store
            }

    async def execute_pipeline_stream(
        self,
        pipeline_def: Dict[str, Any]
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        파이프라인 실행 (스트리밍)

        Yields:
            이벤트: {
                "type": "node_start" | "node_complete" | "node_error",
                "node_id": str,
                "timestamp": float,
                "data": {...}
            }
        """
        graph = self._build_execution_graph(pipeline_def)
        execution_order = list(nx.topological_sort(graph))

        self.data_store = {}
        self.execution_state = {node_id: "pending" for node_id in execution_order}
        self.global_vars = pipeline_def.get('variables', {}).get('global', {})

        for node_id in execution_order:
            # 시작 이벤트
            yield {
                "type": "node_start",
                "node_id": node_id,
                "timestamp": time.time()
            }

            try:
                # 노드 실행
                start_time = time.time()
                await self._execute_node(node_id, pipeline_def)
                execution_time = time.time() - start_time

                # 완료 이벤트
                yield {
                    "type": "node_complete",
                    "node_id": node_id,
                    "timestamp": time.time(),
                    "outputs": self.data_store.get(node_id, {}),
                    "execution_time": execution_time
                }

            except Exception as e:
                # 에러 이벤트
                yield {
                    "type": "node_error",
                    "node_id": node_id,
                    "timestamp": time.time(),
                    "error": str(e)
                }
                break

    def _build_execution_graph(self, pipeline_def: Dict[str, Any]) -> nx.DiGraph:
        """
        방향성 비순환 그래프(DAG) 생성

        Returns:
            NetworkX DiGraph
        """
        graph = nx.DiGraph()

        # 노드 추가
        for node in pipeline_def['nodes']:
            graph.add_node(node['id'], data=node)

        # 엣지 추가 (연결선)
        for edge in pipeline_def['edges']:
            graph.add_edge(
                edge['source'],
                edge['target'],
                data=edge
            )

        # 순환 참조 체크
        if not nx.is_directed_acyclic_graph(graph):
            raise ValueError("Pipeline contains circular dependencies")

        return graph

    async def _execute_node(
        self,
        node_id: str,
        pipeline_def: Dict[str, Any]
    ):
        """
        단일 노드 실행
        """
        node = self._find_node(node_id, pipeline_def)

        logger.info(f"Executing node: {node_id} ({node.get('type', 'unknown')})")

        self.execution_state[node_id] = "running"

        start_time = time.time()

        try:
            # 노드 타입별 처리
            if node['type'] == 'function':
                result = await self._execute_function_node(node, pipeline_def)

            elif node['type'] == 'logic':
                result = await self._execute_logic_node(node, pipeline_def)

            elif node['type'] == 'variable':
                result = await self._execute_variable_node(node, pipeline_def)

            elif node['type'] == 'subpipeline':
                result = await self._execute_subpipeline_node(node, pipeline_def)

            else:
                raise ValueError(f"Unknown node type: {node['type']}")

            # 결과 저장
            self.data_store[node_id] = result
            self.execution_state[node_id] = "completed"

            # 실행 시간 기록
            self.execution_times[node_id] = time.time() - start_time

            logger.info(
                f"Node {node_id} completed in {self.execution_times[node_id]:.3f}s"
            )

        except Exception as e:
            self.execution_state[node_id] = "error"
            self.data_store[node_id] = {"error": str(e)}
            logger.error(f"Node {node_id} failed: {e}")
            raise

    async def _execute_function_node(
        self,
        node: Dict[str, Any],
        pipeline_def: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        플러그인 함수 노드 실행 (핵심!)
        """
        plugin_id = node['plugin_id']
        device_instance = node['device_instance']
        function_id = node['function_id']

        # 입력 수집
        inputs = await self._collect_inputs(node, pipeline_def)

        # Device Manager를 통해 함수 실행
        outputs = await self.device_manager.execute_function(
            instance_id=device_instance,
            function_id=function_id,
            inputs=inputs
        )

        return outputs

    async def _collect_inputs(
        self,
        node: Dict[str, Any],
        pipeline_def: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        노드의 입력 데이터 수집

        Returns:
            {
                'input_name': value,
                ...
            }
        """
        inputs = {}

        # 1. 기본값 (config)
        inputs.update(node.get('config', {}))

        # 2. 연결된 엣지에서 데이터 가져오기
        for edge in pipeline_def['edges']:
            if edge['target'] == node['id']:
                source_node_id = edge['source']
                source_handle = edge['source_handle']  # 출력 핀
                target_handle = edge['target_handle']  # 입력 핀

                # 소스 노드의 출력 데이터
                source_outputs = self.data_store.get(source_node_id, {})

                if source_handle in source_outputs:
                    # 데이터 연결
                    inputs[target_handle] = source_outputs[source_handle]

        # 3. 전역 변수 치환
        inputs = self._replace_variables(inputs)

        return inputs

    def _replace_variables(self, data: Any) -> Any:
        """
        전역 변수 치환

        Example:
            {"value": "{{global.max_torque}}"} ->
            {"value": 5.0}
        """
        if isinstance(data, dict):
            return {k: self._replace_variables(v) for k, v in data.items()}

        elif isinstance(data, list):
            return [self._replace_variables(item) for item in data]

        elif isinstance(data, str) and data.startswith('{{') and data.endswith('}}'):
            # 변수 참조
            var_path = data[2:-2].strip()  # "global.max_torque"

            parts = var_path.split('.')
            if parts[0] == 'global':
                var_name = '.'.join(parts[1:])
                return self.global_vars.get(var_name)

            return data

        else:
            return data

    async def _execute_logic_node(
        self,
        node: Dict[str, Any],
        pipeline_def: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        로직 노드 실행 (If/Else, Loop, etc.)
        """
        function = node.get('function')

        if function == 'branch':
            return await self._execute_branch(node, pipeline_def)

        elif function == 'loop':
            return await self._execute_loop(node, pipeline_def)

        elif function == 'delay':
            return await self._execute_delay(node, pipeline_def)

        else:
            raise ValueError(f"Unknown logic function: {function}")

    async def _execute_branch(
        self,
        node: Dict[str, Any],
        pipeline_def: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        If/Else 분기
        """
        inputs = await self._collect_inputs(node, pipeline_def)

        condition = inputs.get('condition', False)
        operator = node['config'].get('operator', '==')
        threshold = node['config'].get('threshold')

        # 조건 평가
        if operator == '==':
            result = condition == threshold
        elif operator == '>':
            result = condition > threshold
        elif operator == '<':
            result = condition < threshold
        elif operator == '>=':
            result = condition >= threshold
        elif operator == '<=':
            result = condition <= threshold
        else:
            result = bool(condition)

        return {
            'true': result,
            'false': not result
        }

    async def _execute_variable_node(
        self,
        node: Dict[str, Any],
        pipeline_def: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        변수 노드 (Get/Set)
        """
        operation = node.get('operation', 'get')
        var_name = node['config']['variable']

        if operation == 'get':
            value = self.global_vars.get(var_name)
            return {'value': value}

        elif operation == 'set':
            inputs = await self._collect_inputs(node, pipeline_def)
            value = inputs.get('value')
            self.global_vars[var_name] = value
            return {'done': True}

    def _find_node(
        self,
        node_id: str,
        pipeline_def: Dict[str, Any]
    ) -> Dict[str, Any]:
        """노드 찾기"""
        for node in pipeline_def['nodes']:
            if node['id'] == node_id:
                return node
        raise ValueError(f"Node not found: {node_id}")
```

## 4. 병렬 실행 최적화

### 4.1 레벨별 병렬 실행

```python
class ExecutionEngine:

    async def execute_pipeline_parallel(
        self,
        pipeline_def: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        독립적인 노드를 병렬로 실행
        """
        graph = self._build_execution_graph(pipeline_def)

        # 레벨별로 그룹화
        levels = self._get_execution_levels(graph)

        self.data_store = {}
        self.execution_state = {}
        self.global_vars = pipeline_def.get('variables', {}).get('global', {})

        # 레벨별 실행
        for level_idx, level_nodes in enumerate(levels):
            logger.info(f"Executing level {level_idx}: {level_nodes}")

            # 같은 레벨의 노드를 병렬 실행
            tasks = [
                self._execute_node(node_id, pipeline_def)
                for node_id in level_nodes
            ]

            await asyncio.gather(*tasks)

        return {
            "status": "completed",
            "data_store": self.data_store
        }

    def _get_execution_levels(self, graph: nx.DiGraph) -> List[List[str]]:
        """
        실행 레벨 계산

        Example:
            A → B → D
            A → C → D

        Levels:
            [[A], [B, C], [D]]
        """
        levels = []
        remaining = set(graph.nodes())

        while remaining:
            # 의존성이 없는 노드들 (현재 레벨)
            current_level = [
                node for node in remaining
                if all(
                    pred not in remaining
                    for pred in graph.predecessors(node)
                )
            ]

            if not current_level:
                raise ValueError("Circular dependency detected")

            levels.append(current_level)
            remaining -= set(current_level)

        return levels
```

## 5. 데이터 타입 검증

### 5.1 Type Validator

```python
from enum import Enum
from typing import Any

class DataType(Enum):
    TRIGGER = "trigger"
    NUMBER = "number"
    STRING = "string"
    BOOLEAN = "boolean"
    ARRAY = "array"
    OBJECT = "object"
    IMAGE = "image"

class TypeValidator:
    """데이터 타입 검증 및 변환"""

    @staticmethod
    def validate(value: Any, expected_type: DataType) -> bool:
        """타입 검증"""
        if expected_type == DataType.TRIGGER:
            return isinstance(value, bool)

        if expected_type == DataType.NUMBER:
            return isinstance(value, (int, float))

        if expected_type == DataType.STRING:
            return isinstance(value, str)

        if expected_type == DataType.BOOLEAN:
            return isinstance(value, bool)

        if expected_type == DataType.ARRAY:
            return isinstance(value, (list, tuple))

        if expected_type == DataType.IMAGE:
            import numpy as np
            return isinstance(value, np.ndarray)

        return True

    @staticmethod
    def convert(value: Any, target_type: DataType) -> Any:
        """타입 변환"""
        if target_type == DataType.NUMBER:
            return float(value)

        if target_type == DataType.STRING:
            return str(value)

        if target_type == DataType.BOOLEAN:
            return bool(value)

        return value
```

### 5.2 엣지 타입 체크

```python
class ExecutionEngine:

    async def _collect_inputs(
        self,
        node: Dict[str, Any],
        pipeline_def: Dict[str, Any]
    ) -> Dict[str, Any]:
        inputs = {}
        inputs.update(node.get('config', {}))

        # 플러그인 함수 정의 가져오기
        plugin_data = self.plugin_loader.load_plugin(node['plugin_id'])
        func_config = next(
            f for f in plugin_data['config']['functions']
            if f['id'] == node['function_id']
        )

        for edge in pipeline_def['edges']:
            if edge['target'] == node['id']:
                source_outputs = self.data_store.get(edge['source'], {})

                if edge['source_handle'] in source_outputs:
                    value = source_outputs[edge['source_handle']]

                    # 타입 검증
                    target_input = next(
                        inp for inp in func_config['inputs']
                        if inp['name'] == edge['target_handle']
                    )

                    expected_type = DataType[target_input['type'].upper()]

                    if not TypeValidator.validate(value, expected_type):
                        logger.warning(
                            f"Type mismatch: expected {expected_type}, "
                            f"got {type(value)}"
                        )
                        # 자동 변환 시도
                        value = TypeValidator.convert(value, expected_type)

                    inputs[edge['target_handle']] = value

        return inputs
```

## 6. 에러 처리

### 6.1 노드 에러 핸들링

```python
class ExecutionEngine:

    async def _execute_node(
        self,
        node_id: str,
        pipeline_def: Dict[str, Any]
    ):
        """에러 핸들링 포함"""
        node = self._find_node(node_id, pipeline_def)
        retry_count = node.get('retry', 0)
        timeout = node.get('timeout')

        for attempt in range(retry_count + 1):
            try:
                if timeout:
                    # 타임아웃 적용
                    result = await asyncio.wait_for(
                        self._execute_node_internal(node, pipeline_def),
                        timeout=timeout
                    )
                else:
                    result = await self._execute_node_internal(node, pipeline_def)

                self.data_store[node_id] = result
                self.execution_state[node_id] = "completed"
                return

            except asyncio.TimeoutError:
                logger.error(f"Node {node_id} timeout (attempt {attempt + 1})")
                if attempt == retry_count:
                    raise

            except Exception as e:
                logger.error(f"Node {node_id} error (attempt {attempt + 1}): {e}")
                if attempt == retry_count:
                    raise

                # 재시도 전 대기
                await asyncio.sleep(1.0)
```

## 7. 성능 모니터링

### 7.1 실행 통계

```python
class ExecutionStats:
    """실행 통계"""

    def __init__(self):
        self.total_time = 0.0
        self.node_times = {}
        self.node_counts = {}

    def record_node_execution(self, node_id: str, execution_time: float):
        """노드 실행 기록"""
        if node_id not in self.node_times:
            self.node_times[node_id] = []
            self.node_counts[node_id] = 0

        self.node_times[node_id].append(execution_time)
        self.node_counts[node_id] += 1

    def get_summary(self) -> Dict[str, Any]:
        """통계 요약"""
        return {
            "total_time": self.total_time,
            "node_stats": {
                node_id: {
                    "count": self.node_counts[node_id],
                    "total_time": sum(times),
                    "avg_time": sum(times) / len(times),
                    "min_time": min(times),
                    "max_time": max(times)
                }
                for node_id, times in self.node_times.items()
            }
        }
```

## 8. 다음 단계

다음 문서에서는 데이터 흐름을 상세히 다룹니다:

- [08-data-flow.md](./08-data-flow.md) - 노드 간 데이터 연결
