# 제어 흐름 노드 (Control Flow Nodes)

## 개요

제어 흐름 노드는 파이프라인 내에서 반복문(Loop)과 조건문(Condition)을 구현할 수 있게 하는 기능입니다. 이를 통해 동적이고 유연한 파이프라인 실행 흐름을 구성할 수 있습니다.

## 노드 종류

### 1. For Loop (반복문)
고정된 횟수만큼 서브그래프를 반복 실행

### 2. While Loop (조건부 반복문)
조건이 true인 동안 서브그래프를 반복 실행

### 3. If/Else Condition (조건문)
조건에 따라 다른 경로로 실행

### 4. Break (루프 중단)
현재 루프를 즉시 종료

### 5. Continue (루프 계속)
현재 반복을 건너뛰고 다음 반복으로 이동

## For Loop 노드

### 개요
지정된 횟수만큼 루프 본체를 반복 실행합니다.

### 입력 핀
- `trigger` (trigger): 루프 시작 신호
- `iterations` (number): 반복 횟수

### 출력 핀
- `loop_body` (trigger): 루프 본체 시작 신호
- `index` (number): 현재 반복 인덱스 (0부터 시작)
- `complete` (trigger): 루프 완료 신호

### 실행 로직
```python
async def _execute_for_loop(
    self,
    loop_node_id: str,
    loop_config: Dict[str, Any],
    pipeline_def: Dict[str, Any],
    context: ExecutionContext
):
    iterations = loop_config['iterations']
    loop_body_nodes = self._find_connected_nodes(loop_node_id, 'loop_body', pipeline_def)

    for i in range(iterations):
        try:
            # 루프 인덱스 주입
            await context.set_node_output(loop_node_id, {"index": i})

            # 루프 본체 실행
            for body_node_id in loop_body_nodes:
                await self._execute_node(body_node_id, pipeline_def, context)

        except LoopBreakException:
            break  # 루프 종료
        except LoopContinueException:
            continue  # 다음 반복

    # 루프 완료
    await context.set_node_output(loop_node_id, {"complete": True})
```

### 사용 예시

**시나리오 1: 센서 데이터 N번 읽기**
```
[Start] → [For Loop (10회)]
            ↓ loop_body
          [Read Sensor] → [Store Data]
            ↓ complete
          [Analyze All Data]
```

**시나리오 2: 배열 요소 처리**
```
[Get Array] → [For Loop (array.length)]
                ↓ loop_body
              [Process Element (index)] → [Update Result]
                ↓ complete
              [Return Result]
```

## While Loop 노드

### 개요
조건이 true인 동안 루프 본체를 반복 실행합니다.

### 입력 핀
- `trigger` (trigger): 루프 시작 신호
- `condition` (boolean): 루프 조건
- `max_iterations` (number): 최대 반복 횟수 (무한 루프 방지)

### 출력 핀
- `loop_body` (trigger): 루프 본체 시작 신호
- `iteration` (number): 현재 반복 횟수
- `complete` (trigger): 루프 완료 신호

### 실행 로직
```python
async def _execute_while_loop(
    self,
    loop_node_id,
    loop_config,
    pipeline_def,
    context
):
    max_iterations = loop_config['max_iterations']
    loop_body_nodes = self._find_connected_nodes(loop_node_id, 'loop_body', pipeline_def)

    iteration = 0
    while iteration < max_iterations:
        # 조건 재평가
        condition = await self._evaluate_condition(loop_node_id, pipeline_def, context)

        if not condition:
            break

        try:
            await context.set_node_output(loop_node_id, {"iteration": iteration})

            for body_node_id in loop_body_nodes:
                await self._execute_node(body_node_id, pipeline_def, context)

        except LoopBreakException:
            break
        except LoopContinueException:
            pass

        iteration += 1

    await context.set_node_output(loop_node_id, {"complete": True})
```

### 사용 예시

**시나리오 1: 임계값까지 데이터 수집**
```
[Start] → [While Loop (temp < 100)]
            ↓ loop_body
          [Read Temperature] → [Store]
            ↓ complete
          [Process Data]
```

**시나리오 2: 에러 재시도**
```
[Start] → [While Loop (not success && retries < 5)]
            ↓ loop_body
          [Try Operation] → [Check Result]
            ↓ complete
          [Final Status]
```

## If/Else Condition 노드

### 개요
조건에 따라 true 또는 false 경로로 실행을 분기합니다.

### 입력 핀
- `trigger` (trigger): 조건 평가 시작 신호
- `condition` (boolean): 평가할 조건

### 출력 핀
- `true_branch` (trigger): 조건이 true일 때 실행
- `false_branch` (trigger): 조건이 false일 때 실행
- `complete` (trigger): 분기 실행 완료 신호

### 실행 로직
```python
async def _execute_condition(
    self,
    cond_node_id,
    cond_config,
    pipeline_def,
    context
):
    condition = cond_config['condition']

    if condition:
        # true_branch 실행
        true_nodes = self._find_connected_nodes(cond_node_id, 'true_branch', pipeline_def)
        for node_id in true_nodes:
            await self._execute_node(node_id, pipeline_def, context)
    else:
        # false_branch 실행
        false_nodes = self._find_connected_nodes(cond_node_id, 'false_branch', pipeline_def)
        for node_id in false_nodes:
            await self._execute_node(node_id, pipeline_def, context)

    await context.set_node_output(cond_node_id, {"complete": True})
```

### 사용 예시

**시나리오 1: 임계값 알람**
```
[Read Sensor] → [If/Else (value > 80)]
                  ↓ true_branch
                [Send Alert] → [Log Warning]
                  ↓ false_branch
                [Normal Operation]
                  ↓ complete
                [Continue]
```

**시나리오 2: 데이터 유효성 검사**
```
[Get Data] → [If/Else (is_valid)]
              ↓ true_branch
            [Process Data] → [Save]
              ↓ false_branch
            [Log Error] → [Retry]
```

## Break 노드

### 개요
현재 실행 중인 루프를 즉시 종료합니다.

### 입력 핀
- `trigger` (trigger): Break 실행 신호

### 출력 핀
없음 (예외 발생으로 루프 종료)

### 실행 로직
```python
class BreakFunction(BaseFunction):
    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        raise LoopBreakException()  # 특수 예외
```

### 사용 예시

**시나리오: 조건 충족 시 루프 종료**
```
[For Loop (100회)]
  ↓ loop_body
[Read Data] → [If/Else (found_target)]
                ↓ true_branch
              [Break]  # 루프 즉시 종료
                ↓ false_branch
              [Continue Processing]
```

## Continue 노드

### 개요
현재 반복을 건너뛰고 다음 반복으로 이동합니다.

### 입력 핀
- `trigger` (trigger): Continue 실행 신호

### 출력 핀
없음 (예외 발생으로 다음 반복으로 이동)

### 실행 로직
```python
class ContinueFunction(BaseFunction):
    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        raise LoopContinueException()  # 특수 예외
```

### 사용 예시

**시나리오: 유효하지 않은 데이터 건너뛰기**
```
[For Loop (100회)]
  ↓ loop_body
[Read Item] → [If/Else (is_invalid)]
                ↓ true_branch
              [Continue]  # 다음 반복으로
                ↓ false_branch
              [Process Valid Item]
```

## 고급 사용 예시

### 예시 1: 중첩 루프
```
[For Loop 1 (10회)]
  ↓ loop_body
  [For Loop 2 (5회)]
    ↓ loop_body
    [Process (i, j)]
```

### 예시 2: 루프 + 조건문
```
[While Loop (has_more_data)]
  ↓ loop_body
  [Read Batch] → [If/Else (batch_size > 0)]
                   ↓ true_branch
                 [Process Batch]
                   ↓ false_branch
                 [Break]  # 더 이상 데이터 없음
```

### 예시 3: 재시도 로직
```
[Start] → [For Loop (max_retries)]
            ↓ loop_body
          [Try Operation] → [If/Else (success)]
                              ↓ true_branch
                            [Break]  # 성공 시 종료
                              ↓ false_branch
                            [Wait] → [Continue]  # 재시도
            ↓ complete
          [Handle Final Result]
```

## 프론트엔드 UI

### For Loop 노드 디자인
```typescript
<div className="control-flow-node for-loop">
  <div className="node-header bg-blue-600">
    <span>🔁</span> For Loop
  </div>

  <div className="node-body">
    <div className="text-sm">
      Iterations: <strong>{iterations}</strong>
    </div>

    {/* Handles... */}
  </div>
</div>
```

**스타일링:**
- 파란색 테두리
- 둥근 모서리
- 루프 아이콘 (🔁)

### Condition 노드 디자인
```typescript
<div className="control-flow-node condition">
  <div className="node-header bg-yellow-600">
    <span>❓</span> If/Else
  </div>

  <div className="node-body">
    {/* True/False 브랜치 표시 */}
    <div className="flex justify-between">
      <div className="text-green-400">True ✓</div>
      <div className="text-red-400">False ✗</div>
    </div>
  </div>
</div>
```

**스타일링:**
- 노란색 테두리
- 마름모 모양 (선택사항)
- 조건 아이콘 (❓)

## 성능 고려사항

### 1. 무한 루프 방지
- While Loop에 `max_iterations` 필수
- 기본값: 1000
- 초과 시 자동 종료 및 경고

### 2. 메모리 관리
- 루프 내 데이터 누적 주의
- 필요 없는 데이터 즉시 정리
- 큰 데이터는 스트리밍 처리

### 3. 실행 시간
- 긴 루프는 비동기로 처리
- 진행 상황 WebSocket으로 전송
- 취소 기능 제공

## 디버깅 도구

### 1. 루프 진행 상황 표시
```typescript
{nodeExecutionStatus === 'executing' && isLoopNode && (
  <div className="loop-progress">
    Iteration: {currentIteration} / {totalIterations}
  </div>
)}
```

### 2. 브레이크포인트
- 특정 반복에서 일시 정지
- 변수 값 검사
- 단계별 실행

### 3. 로그
- 각 반복의 입출력 기록
- 조건 평가 결과 기록
- Break/Continue 발생 시점 기록

## 모범 사례

### 1. 명확한 종료 조건
```python
# 좋은 예
while sensor_value < threshold and iteration < 100:
    # ...

# 나쁜 예 (무한 루프 가능)
while True:
    # ...
```

### 2. 인덱스 활용
```python
# For Loop의 index 출력 활용
for i in range(iterations):
    data[i] = process(input[i])
```

### 3. 조건 재평가
```python
# While Loop는 매 반복마다 조건 재평가
while condition:  # condition은 매번 새로 계산
    # ...
```

## 제한사항

### 1. 최대 중첩 깊이
- 권장: 3단계
- 최대: 5단계
- 초과 시 성능 저하

### 2. 최대 반복 횟수
- For Loop: 10,000
- While Loop: 1,000 (안전장치)
- 초과 시 에러 또는 경고

### 3. 타임아웃
- 단일 루프 최대 실행 시간: 60초
- 초과 시 자동 종료

## 향후 개선 사항

1. **병렬 루프**
   - 각 반복을 병렬로 실행
   - 성능 향상

2. **고급 제어 흐름**
   - Switch/Case 문
   - Try/Catch 문

3. **시각화 개선**
   - 실행 흐름 애니메이션
   - 루프 펼치기/접기

4. **성능 최적화**
   - 루프 언롤링
   - JIT 컴파일
