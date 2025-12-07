# 플러그인 개발 가이드

## 1. 시작하기

이 가이드는 새로운 하드웨어 디바이스를 위한 플러그인을 만드는 방법을 설명합니다.

## 2. 플러그인 생성 단계

### 2.1 Step 1: 플러그인 폴더 생성

```bash
cd backend/plugins
mkdir my_sensor
cd my_sensor
```

### 2.2 Step 2: 필수 파일 생성

```bash
touch __init__.py
touch config.yaml
touch device.py
touch functions.py
touch README.md
```

### 2.3 Step 3: config.yaml 작성

```yaml
plugin:
  id: "my_sensor"
  name: "My Sensor"
  version: "1.0.0"
  author: "Your Name"
  description: "Custom sensor plugin"
  category: "Sensors"
  color: "#ff6b6b"

device:
  class: "MySensorDevice"
  connection_types:
    - serial

  instance_config:
    - name: "port"
      type: "string"
      default: "COM1"
      description: "Serial port"

    - name: "baudrate"
      type: "integer"
      default: 9600
      options: [9600, 19200, 38400, 57600, 115200]

functions:
  - id: "read_value"
    name: "Read Sensor Value"
    description: "Read current sensor value"

    inputs:
      - name: "trigger"
        type: "trigger"

    outputs:
      - name: "value"
        type: "number"
        unit: "units"

      - name: "timestamp"
        type: "number"
        unit: "seconds"
```

### 2.4 Step 4: device.py 구현

```python
# plugins/my_sensor/device.py

from core.base_device import BaseDevice, DeviceStatus
from typing import Any, Dict
import serial
import asyncio

class MySensorDevice(BaseDevice):
    """Custom Sensor Device"""

    def __init__(self, instance_id: str, config: Dict[str, Any]):
        super().__init__(instance_id, config)

        self.port = config.get('port', 'COM1')
        self.baudrate = config.get('baudrate', 9600)
        self.connection = None

    async def connect(self) -> bool:
        """디바이스 연결"""
        try:
            self.status = DeviceStatus.CONNECTING

            self.connection = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=1.0
            )

            await asyncio.sleep(0.1)

            # 연결 확인 (예: 버전 조회)
            self.connection.write(b'VER?\r\n')
            response = self.connection.readline()

            if not response:
                raise Exception("No response")

            self.status = DeviceStatus.CONNECTED
            return True

        except Exception as e:
            self.set_error(str(e))
            return False

    async def disconnect(self) -> bool:
        """연결 해제"""
        if self.connection:
            self.connection.close()
            self.connection = None

        self.status = DeviceStatus.DISCONNECTED
        return True

    async def health_check(self) -> bool:
        """상태 확인"""
        if not self.connection or not self.connection.is_open:
            return False

        try:
            self.connection.write(b'?\r\n')
            response = self.connection.read(1)
            return len(response) > 0
        except:
            return False

    def get_info(self) -> Dict[str, Any]:
        """디바이스 정보"""
        return {
            "id": self.instance_id,
            "type": "my_sensor",
            "status": self.status.value,
            "config": {
                "port": self.port,
                "baudrate": self.baudrate
            }
        }

    # 헬퍼 메서드
    def read_value(self) -> float:
        """센서 값 읽기"""
        self.connection.write(b'READ\r\n')
        response = self.connection.readline().decode().strip()
        return float(response)
```

### 2.5 Step 5: functions.py 구현

```python
# plugins/my_sensor/functions.py

from core.base_function import BaseFunction
from typing import Any, Dict
import time

class ReadValueFunction(BaseFunction):
    """Read Sensor Value 함수"""

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        센서 값 읽기

        Args:
            inputs: {'trigger': True}

        Returns:
            {'value': 123.45, 'timestamp': 1234567890.123}
        """
        device = self.get_device()

        # 센서 값 읽기
        value = device.read_value()

        # 타임스탬프
        timestamp = time.time()

        return {
            'value': value,
            'timestamp': timestamp
        }
```

### 2.6 Step 6: 테스트

```python
# test_my_sensor.py

import asyncio
from plugins.my_sensor.device import MySensorDevice
from plugins.my_sensor.functions import ReadValueFunction

async def test_sensor():
    # 디바이스 생성
    device = MySensorDevice(
        instance_id="test_sensor",
        config={"port": "COM1", "baudrate": 9600}
    )

    # 연결
    connected = await device.connect()
    assert connected, "Failed to connect"

    # 함수 실행
    func = ReadValueFunction(device)
    result = await func.execute({'trigger': True})

    print(f"Sensor value: {result['value']}")
    print(f"Timestamp: {result['timestamp']}")

    # 연결 해제
    await device.disconnect()

if __name__ == "__main__":
    asyncio.run(test_sensor())
```

## 3. 고급 기능

### 3.1 에러 핸들링

```python
class MyFunction(BaseFunction):
    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        try:
            # 작업 수행
            result = await self._do_work(inputs)

            return {
                'success': True,
                'data': result,
                'error': False,
                'error_msg': ""
            }

        except TimeoutError as e:
            return {
                'success': False,
                'data': None,
                'error': True,
                'error_msg': f"Timeout: {str(e)}"
            }

        except Exception as e:
            return {
                'success': False,
                'data': None,
                'error': True,
                'error_msg': str(e)
            }
```

### 3.2 Progress Callback

```python
class LongRunningFunction(BaseFunction):
    async def execute(
        self,
        inputs: Dict[str, Any],
        progress_callback=None
    ) -> Dict[str, Any]:
        """긴 작업 with progress"""

        total_steps = 100

        for i in range(total_steps):
            # 작업 수행
            await self._process_step(i)

            # Progress 알림
            if progress_callback:
                await progress_callback({
                    'current': i + 1,
                    'total': total_steps,
                    'percentage': (i + 1) / total_steps * 100
                })

        return {'complete': True}
```

### 3.3 스트리밍 출력

```python
class StreamingFunction(BaseFunction):
    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """스트리밍 데이터 (예: 연속 측정)"""

        # 제너레이터 반환
        async def stream_data():
            for i in range(100):
                value = await self._read_sensor()
                yield {
                    'index': i,
                    'value': value,
                    'timestamp': time.time()
                }
                await asyncio.sleep(0.1)

        return {
            'stream': stream_data()
        }
```

### 3.4 설정 검증

```python
class MySensorDevice(BaseDevice):
    def __init__(self, instance_id: str, config: Dict[str, Any]):
        # 설정 검증
        self._validate_config(config)

        super().__init__(instance_id, config)

    def _validate_config(self, config: Dict[str, Any]):
        """설정 검증"""
        # 포트 체크
        port = config.get('port')
        if not port:
            raise ValueError("Port is required")

        # Baudrate 체크
        baudrate = config.get('baudrate', 9600)
        valid_baudrates = [9600, 19200, 38400, 57600, 115200]
        if baudrate not in valid_baudrates:
            raise ValueError(f"Invalid baudrate: {baudrate}")
```

## 4. 플러그인 배포

### 4.1 패키징

```bash
# 플러그인 폴더 압축
cd plugins
zip -r my_sensor.zip my_sensor/
```

### 4.2 설치 (사용자)

```bash
# 플러그인 압축 해제
unzip my_sensor.zip -d plugins/

# 서버 재시작 (또는 hot reload)
```

### 4.3 의존성 포함

`requirements.txt` 생성:

```txt
# plugins/my_sensor/requirements.txt
pyserial>=3.5
numpy>=1.24.0
```

설치 스크립트:

```python
# plugins/my_sensor/install.py

import subprocess
import sys
from pathlib import Path

def install_dependencies():
    """플러그인 의존성 설치"""
    requirements_file = Path(__file__).parent / "requirements.txt"

    if requirements_file.exists():
        subprocess.check_call([
            sys.executable,
            "-m",
            "pip",
            "install",
            "-r",
            str(requirements_file)
        ])

if __name__ == "__main__":
    install_dependencies()
```

## 5. Best Practices

### 5.1 네이밍 규칙

- **Plugin ID**: 소문자, 언더스코어 (예: `my_sensor`, `dio_controller`)
- **Class 이름**: PascalCase (예: `MySensorDevice`, `ReadValueFunction`)
- **함수 ID**: 소문자, 언더스코어 (예: `read_value`, `set_output`)

### 5.2 에러 메시지

```python
# ❌ 나쁜 예
raise Exception("Error")

# ✅ 좋은 예
raise Exception(f"Failed to read sensor on port {self.port}: Connection timeout")
```

### 5.3 로깅

```python
import logging

logger = logging.getLogger(__name__)

class MySensorDevice(BaseDevice):
    async def connect(self) -> bool:
        logger.info(f"Connecting to sensor on {self.port}...")

        try:
            # 연결 로직
            logger.info(f"Successfully connected to {self.port}")
            return True

        except Exception as e:
            logger.error(f"Connection failed: {e}")
            return False
```

### 5.4 타임아웃 설정

```python
async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
    timeout = inputs.get('timeout', 5.0)  # 기본 5초

    try:
        result = await asyncio.wait_for(
            self._do_work(),
            timeout=timeout
        )
        return {'success': True, 'data': result}

    except asyncio.TimeoutError:
        return {'success': False, 'error_msg': 'Operation timeout'}
```

### 5.5 리소스 정리

```python
class MySensorDevice(BaseDevice):
    async def disconnect(self) -> bool:
        """리소스 정리"""
        try:
            # 연결 종료
            if self.connection:
                self.connection.close()

            # 파일 핸들 정리
            if hasattr(self, 'log_file') and self.log_file:
                self.log_file.close()

            # 기타 리소스
            # ...

            return True

        except Exception as e:
            logger.error(f"Cleanup error: {e}")
            return False
```

## 6. 테스트

### 6.1 단위 테스트

```python
# tests/test_my_sensor.py

import pytest
import asyncio
from plugins.my_sensor.device import MySensorDevice
from plugins.my_sensor.functions import ReadValueFunction

@pytest.fixture
async def device():
    """테스트 디바이스"""
    dev = MySensorDevice(
        instance_id="test",
        config={"port": "COM1", "baudrate": 9600}
    )
    await dev.connect()
    yield dev
    await dev.disconnect()

@pytest.mark.asyncio
async def test_read_value(device):
    """센서 값 읽기 테스트"""
    func = ReadValueFunction(device)
    result = await func.execute({'trigger': True})

    assert 'value' in result
    assert isinstance(result['value'], (int, float))
    assert 'timestamp' in result

@pytest.mark.asyncio
async def test_connection_error():
    """연결 실패 테스트"""
    device = MySensorDevice(
        instance_id="test",
        config={"port": "INVALID_PORT", "baudrate": 9600}
    )

    connected = await device.connect()
    assert not connected
    assert device.status == DeviceStatus.ERROR
```

### 6.2 Mock 디바이스

```python
# plugins/my_sensor/mock_device.py

class MockMySensorDevice(MySensorDevice):
    """테스트용 Mock 디바이스"""

    def __init__(self, instance_id: str, config: Dict[str, Any]):
        super().__init__(instance_id, config)
        self.mock_value = 100.0

    async def connect(self) -> bool:
        """Mock 연결 (항상 성공)"""
        self.status = DeviceStatus.CONNECTED
        return True

    async def disconnect(self) -> bool:
        self.status = DeviceStatus.DISCONNECTED
        return True

    def read_value(self) -> float:
        """Mock 데이터 반환"""
        return self.mock_value
```

## 7. 문서화

### 7.1 README.md

```markdown
# My Sensor Plugin

## 개요
This plugin provides support for My Sensor hardware.

## 설치
1. Copy plugin folder to `backend/plugins/`
2. Install dependencies: `pip install -r requirements.txt`
3. Restart server

## 설정
- **port**: Serial port (default: COM1)
- **baudrate**: Communication speed (default: 9600)

## 함수
### Read Value
Read current sensor value

**Inputs:**
- trigger (trigger): Execute read

**Outputs:**
- value (number): Sensor value
- timestamp (number): Unix timestamp

## 예제
See `examples/` folder for usage examples.

## 라이선스
MIT License
```

### 7.2 예제

```python
# examples/basic_usage.py

import asyncio
from core.device_manager import DeviceManager

async def main():
    dm = DeviceManager()

    # 디바이스 생성
    instance_id = await dm.create_device_instance(
        plugin_id="my_sensor",
        instance_id="sensor_1",
        config={"port": "COM1", "baudrate": 9600}
    )

    # 함수 실행
    result = await dm.execute_function(
        instance_id="sensor_1",
        function_id="read_value",
        inputs={'trigger': True}
    )

    print(f"Sensor value: {result['value']}")

    # 정리
    await dm.remove_device_instance("sensor_1")

if __name__ == "__main__":
    asyncio.run(main())
```

## 8. 다음 단계

다음 문서에서는 실행 엔진을 상세히 다룹니다:

- [07-execution-engine.md](./07-execution-engine.md) - 파이프라인 실행 메커니즘
