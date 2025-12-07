# 플러그인 아키텍처

## 1. 개요

플러그인 시스템은 새로운 하드웨어 디바이스와 기능을 코드 수정 없이 추가할 수 있도록 설계되었습니다.

## 2. 플러그인 구조

### 2.1 폴더 구조

```
backend/plugins/
├─ servo/
│   ├─ __init__.py
│   ├─ config.yaml          # 플러그인 메타데이터
│   ├─ device.py            # 디바이스 클래스
│   ├─ functions.py         # 함수 구현
│   ├─ icon.svg             # 아이콘
│   └─ README.md            # 문서
│
├─ dio/
│   ├─ __init__.py
│   ├─ config.yaml
│   ├─ device.py
│   └─ functions.py
│
└─ custom_sensor/           # 사용자 추가 플러그인
    ├─ __init__.py
    ├─ config.yaml
    ├─ device.py
    └─ functions.py
```

### 2.2 config.yaml 상세

```yaml
plugin:
  id: "servo"                           # 플러그인 고유 ID
  name: "Servo Motor Controller"        # 표시 이름
  version: "1.0.0"                      # 버전
  author: "Your Company"                # 작성자
  description: "Control servo motors"   # 설명
  icon: "icon.svg"                      # 아이콘 파일
  category: "Motion Control"            # 카테고리
  color: "#4a90e2"                      # UI 색상 (헤더)

  # 의존성 (선택사항)
  dependencies:
    - pyserial>=3.5
    - numpy>=1.24.0

  # 라이선스
  license: "MIT"

  # 최소 시스템 요구사항
  requires:
    python: ">=3.9"
    platform: ["windows", "linux"]

device:
  class: "ServoDevice"                  # 디바이스 클래스 이름

  # 연결 타입
  connection_types:
    - serial
    - ethernet

  # 디바이스 인스턴스 설정 필드
  instance_config:
    - name: "port"
      type: "string"
      default: "COM1"
      description: "Serial port or IP address"
      validation:
        pattern: "^(COM\\d+|/dev/tty.*|\\d+\\.\\d+\\.\\d+\\.\\d+)$"

    - name: "baudrate"
      type: "integer"
      default: 115200
      options: [9600, 19200, 38400, 57600, 115200]
      description: "Communication baudrate"

    - name: "axis_count"
      type: "integer"
      default: 4
      min: 1
      max: 32
      description: "Number of axes"

    - name: "timeout"
      type: "number"
      default: 1.0
      min: 0.1
      max: 10.0
      unit: "seconds"

functions:
  # 함수 1: Home Axis
  - id: "home"
    name: "Home Axis"
    description: "Move axis to home position"
    icon: "🏠"

    inputs:
      - name: "axis"
        type: "number"
        default: 0
        min: 0
        max: 31
        description: "Axis number"

      - name: "speed"
        type: "number"
        default: 100.0
        min: 0.1
        max: 1000.0
        unit: "mm/s"
        description: "Homing speed"

    outputs:
      - name: "complete"
        type: "trigger"
        description: "Triggered when homing complete"

      - name: "position"
        type: "number"
        unit: "pulses"
        description: "Final position (should be 0)"

  # 함수 2: Move Absolute
  - id: "move_absolute"
    name: "Move Absolute"
    description: "Move to absolute position"
    icon: "➡"

    inputs:
      - name: "trigger"
        type: "trigger"
        description: "Execute move"

      - name: "axis"
        type: "number"
        default: 0

      - name: "position"
        type: "number"
        default: 0.0
        unit: "pulses"

      - name: "speed"
        type: "number"
        default: 500.0
        unit: "pulses/s"

      - name: "accel"
        type: "number"
        default: 100.0
        unit: "pulses/s²"

    outputs:
      - name: "complete"
        type: "trigger"

      - name: "actual_position"
        type: "number"
        unit: "pulses"

      - name: "error"
        type: "trigger"
        description: "Triggered on error"

      - name: "error_msg"
        type: "string"
        description: "Error message"

  # 함수 3: Get Position
  - id: "get_position"
    name: "Get Position"
    description: "Read current position"
    icon: "📍"

    inputs:
      - name: "axis"
        type: "number"
        default: 0

    outputs:
      - name: "position"
        type: "number"
        unit: "pulses"

      - name: "velocity"
        type: "number"
        unit: "pulses/s"

      - name: "in_position"
        type: "boolean"
        description: "True if at target position"
```

## 3. 베이스 클래스

### 3.1 BaseDevice

```python
# core/base_device.py

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from enum import Enum

class DeviceStatus(Enum):
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    ERROR = "error"

class BaseDevice(ABC):
    """
    모든 디바이스 플러그인의 베이스 클래스
    """

    def __init__(self, instance_id: str, config: Dict[str, Any]):
        """
        Args:
            instance_id: 디바이스 인스턴스 고유 ID
            config: 인스턴스 설정 (config.yaml의 instance_config 값들)
        """
        self.instance_id = instance_id
        self.config = config
        self.status = DeviceStatus.DISCONNECTED
        self.error_message: Optional[str] = None
        self.metadata: Dict[str, Any] = {}

    @abstractmethod
    async def connect(self) -> bool:
        """
        디바이스 연결

        Returns:
            성공 시 True, 실패 시 False
        """
        pass

    @abstractmethod
    async def disconnect(self) -> bool:
        """
        디바이스 연결 해제

        Returns:
            성공 시 True
        """
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """
        디바이스 상태 확인

        Returns:
            정상 시 True, 이상 시 False
        """
        pass

    @abstractmethod
    def get_info(self) -> Dict[str, Any]:
        """
        디바이스 정보 반환

        Returns:
            {
                "id": instance_id,
                "type": plugin_id,
                "status": status,
                "config": config,
                ...
            }
        """
        pass

    # 유틸리티 메서드
    def set_error(self, message: str):
        """에러 설정"""
        self.status = DeviceStatus.ERROR
        self.error_message = message

    def clear_error(self):
        """에러 클리어"""
        if self.status == DeviceStatus.ERROR:
            self.status = DeviceStatus.DISCONNECTED
        self.error_message = None
```

### 3.2 BaseFunction

```python
# core/base_function.py

from abc import ABC, abstractmethod
from typing import Any, Dict

class BaseFunction(ABC):
    """
    모든 함수의 베이스 클래스
    """

    def __init__(self, device_instance: 'BaseDevice'):
        """
        Args:
            device_instance: 연결된 디바이스 인스턴스
        """
        self.device_instance = device_instance

    def get_device(self) -> 'BaseDevice':
        """연결된 디바이스 가져오기"""
        return self.device_instance

    @abstractmethod
    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        함수 실행

        Args:
            inputs: {
                'input_name': value,
                ...
            }

        Returns:
            outputs: {
                'output_name': value,
                ...
            }
        """
        pass

    # 헬퍼 메서드
    def validate_inputs(self, inputs: Dict[str, Any], schema: Dict[str, Any]):
        """입력 검증"""
        for name, rules in schema.items():
            value = inputs.get(name)

            # 필수 체크
            if rules.get('required', False) and value is None:
                raise ValueError(f"Required input '{name}' is missing")

            # 타입 체크
            if value is not None and 'type' in rules:
                expected_type = rules['type']
                if not isinstance(value, expected_type):
                    raise TypeError(
                        f"Input '{name}' expected {expected_type}, got {type(value)}"
                    )

            # 범위 체크
            if value is not None and isinstance(value, (int, float)):
                if 'min' in rules and value < rules['min']:
                    raise ValueError(f"Input '{name}' below minimum {rules['min']}")
                if 'max' in rules and value > rules['max']:
                    raise ValueError(f"Input '{name}' above maximum {rules['max']}")
```

## 4. 플러그인 예시

### 4.1 Servo Plugin - device.py

```python
# plugins/servo/device.py

from core.base_device import BaseDevice, DeviceStatus
from typing import Any, Dict
import serial
import asyncio

class ServoDevice(BaseDevice):
    """
    Servo Motor Controller Device
    """

    def __init__(self, instance_id: str, config: Dict[str, Any]):
        super().__init__(instance_id, config)

        self.port = config.get('port', 'COM1')
        self.baudrate = config.get('baudrate', 115200)
        self.timeout = config.get('timeout', 1.0)
        self.axis_count = config.get('axis_count', 4)

        self.connection: Optional[serial.Serial] = None
        self.is_connected = False

    async def connect(self) -> bool:
        """시리얼 포트 연결"""
        try:
            self.status = DeviceStatus.CONNECTING

            # 시리얼 포트 열기
            self.connection = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=self.timeout
            )

            # 연결 확인
            await asyncio.sleep(0.1)  # 초기화 대기

            # 버전 확인
            self.connection.write(b'VER?\n')
            response = self.connection.readline().decode().strip()

            if not response:
                raise Exception("No response from device")

            self.metadata['version'] = response
            self.status = DeviceStatus.CONNECTED
            self.is_connected = True

            return True

        except Exception as e:
            self.set_error(f"Connection failed: {str(e)}")
            return False

    async def disconnect(self) -> bool:
        """연결 해제"""
        if self.connection:
            try:
                self.connection.close()
            except:
                pass
            finally:
                self.connection = None
                self.is_connected = False
                self.status = DeviceStatus.DISCONNECTED

        return True

    async def health_check(self) -> bool:
        """상태 확인"""
        if not self.connection or not self.connection.is_open:
            self.status = DeviceStatus.ERROR
            return False

        try:
            # 간단한 통신 테스트
            self.connection.write(b'?\n')
            response = self.connection.read(1)
            return len(response) > 0
        except:
            self.status = DeviceStatus.ERROR
            return False

    def get_info(self) -> Dict[str, Any]:
        """디바이스 정보"""
        return {
            "id": self.instance_id,
            "type": "servo",
            "status": self.status.value,
            "config": {
                "port": self.port,
                "baudrate": self.baudrate,
                "axis_count": self.axis_count
            },
            "metadata": self.metadata,
            "error": self.error_message
        }

    # 디바이스 전용 메서드
    def send_command(self, command: str) -> str:
        """명령 전송 및 응답 수신"""
        if not self.is_connected:
            raise Exception("Device not connected")

        self.connection.write(f"{command}\n".encode())
        response = self.connection.readline().decode().strip()
        return response
```

### 4.2 Servo Plugin - functions.py

```python
# plugins/servo/functions.py

from core.base_function import BaseFunction
from typing import Any, Dict
import asyncio

class HomeAxisFunction(BaseFunction):
    """Home Axis 함수"""

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        축 홈 복귀

        Args:
            inputs: {
                'axis': 0,
                'speed': 100.0
            }

        Returns:
            {
                'complete': True,
                'position': 0.0
            }
        """
        # 입력 검증
        self.validate_inputs(inputs, {
            'axis': {'required': True, 'type': int, 'min': 0},
            'speed': {'required': True, 'type': float, 'min': 0.1}
        })

        device = self.get_device()
        axis = inputs['axis']
        speed = inputs['speed']

        # 축 번호 범위 확인
        if axis >= device.axis_count:
            raise ValueError(f"Axis {axis} out of range (0-{device.axis_count-1})")

        # 홈 명령 전송
        command = f"HOME {axis} {speed}"
        device.send_command(command)

        # 완료 대기 (폴링)
        timeout = 30.0
        start_time = asyncio.get_event_loop().time()

        while True:
            # 타임아웃 체크
            if asyncio.get_event_loop().time() - start_time > timeout:
                raise TimeoutError(f"Home operation timeout for axis {axis}")

            # 상태 확인
            status = device.send_command(f"STATUS? {axis}")

            if "HOME_COMPLETE" in status:
                break

            await asyncio.sleep(0.01)

        # 최종 위치 확인
        position = float(device.send_command(f"POS? {axis}"))

        return {
            'complete': True,
            'position': position
        }


class MoveAbsoluteFunction(BaseFunction):
    """Move Absolute 함수"""

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        절대 위치 이동
        """
        # 입력 검증
        self.validate_inputs(inputs, {
            'axis': {'required': True, 'type': int},
            'position': {'required': True, 'type': (int, float)},
            'speed': {'required': True, 'type': (int, float)},
            'accel': {'required': True, 'type': (int, float)}
        })

        device = self.get_device()
        axis = inputs['axis']
        position = inputs['position']
        speed = inputs['speed']
        accel = inputs['accel']

        try:
            # 이동 명령
            command = f"MOVE {axis} {position} {speed} {accel}"
            device.send_command(command)

            # 완료 대기
            timeout = 60.0
            start_time = asyncio.get_event_loop().time()

            while True:
                if asyncio.get_event_loop().time() - start_time > timeout:
                    raise TimeoutError("Move operation timeout")

                status = device.send_command(f"STATUS? {axis}")

                if "MOVE_COMPLETE" in status:
                    break

                if "ERROR" in status:
                    raise Exception(f"Move error: {status}")

                await asyncio.sleep(0.01)

            # 실제 위치 확인
            actual_position = float(device.send_command(f"POS? {axis}"))

            return {
                'complete': True,
                'actual_position': actual_position,
                'error': False,
                'error_msg': ""
            }

        except Exception as e:
            return {
                'complete': False,
                'actual_position': 0.0,
                'error': True,
                'error_msg': str(e)
            }


class GetPositionFunction(BaseFunction):
    """Get Position 함수"""

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """현재 위치 읽기"""
        self.validate_inputs(inputs, {
            'axis': {'required': True, 'type': int}
        })

        device = self.get_device()
        axis = inputs['axis']

        # 위치, 속도, 상태 읽기
        position = float(device.send_command(f"POS? {axis}"))
        velocity = float(device.send_command(f"VEL? {axis}"))
        in_position = bool(int(device.send_command(f"INPOS? {axis}")))

        return {
            'position': position,
            'velocity': velocity,
            'in_position': in_position
        }
```

## 5. 플러그인 로더

### 5.1 Plugin Loader

```python
# core/plugin_loader.py

import os
import importlib
import yaml
from typing import Dict, List, Any
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class PluginLoader:
    """
    플러그인 동적 로딩 시스템
    """

    def __init__(self, plugin_dir: str = "plugins"):
        self.plugin_dir = Path(plugin_dir)
        self.loaded_plugins: Dict[str, Dict[str, Any]] = {}
        self.plugin_cache: Dict[str, Any] = {}

    def discover_plugins(self) -> List[Dict[str, Any]]:
        """
        플러그인 폴더 스캔

        Returns:
            List of plugin metadata
        """
        plugins = []

        if not self.plugin_dir.exists():
            logger.warning(f"Plugin directory not found: {self.plugin_dir}")
            return plugins

        for plugin_path in self.plugin_dir.iterdir():
            if not plugin_path.is_dir():
                continue

            if plugin_path.name.startswith('_'):
                continue

            config_file = plugin_path / "config.yaml"
            if not config_file.exists():
                logger.warning(f"No config.yaml in {plugin_path.name}")
                continue

            try:
                # config.yaml 로드
                with open(config_file, 'r', encoding='utf-8') as f:
                    config = yaml.safe_load(f)

                plugin_info = {
                    'path': str(plugin_path),
                    'id': config['plugin']['id'],
                    'name': config['plugin']['name'],
                    'version': config['plugin']['version'],
                    'author': config['plugin'].get('author', 'Unknown'),
                    'description': config['plugin'].get('description', ''),
                    'category': config['plugin'].get('category', 'General'),
                    'color': config['plugin'].get('color', '#888888'),
                    'config': config
                }

                plugins.append(plugin_info)
                logger.info(f"Discovered plugin: {plugin_info['id']} v{plugin_info['version']}")

            except Exception as e:
                logger.error(f"Failed to load plugin {plugin_path.name}: {e}")

        return plugins

    def load_plugin(self, plugin_id: str) -> Dict[str, Any]:
        """
        플러그인 로드

        Args:
            plugin_id: 플러그인 ID

        Returns:
            {
                'config': config dict,
                'device_class': DeviceClass,
                'functions': {'func_id': FunctionClass, ...}
            }
        """
        # 캐시 확인
        if plugin_id in self.loaded_plugins:
            return self.loaded_plugins[plugin_id]

        # 플러그인 경로 찾기
        plugin_path = self.plugin_dir / plugin_id
        if not plugin_path.exists():
            raise FileNotFoundError(f"Plugin not found: {plugin_id}")

        config_file = plugin_path / "config.yaml"

        # Config 로드
        with open(config_file, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)

        # Device 클래스 동적 import
        module_name = f"plugins.{plugin_id}.device"
        device_module = importlib.import_module(module_name)

        device_class_name = config['device']['class']
        device_class = getattr(device_module, device_class_name)

        # Functions 로드
        functions_module = importlib.import_module(f"plugins.{plugin_id}.functions")
        functions = {}

        for func_config in config['functions']:
            func_id = func_config['id']
            func_class_name = self._to_class_name(func_id)

            if hasattr(functions_module, func_class_name):
                functions[func_id] = getattr(functions_module, func_class_name)
            else:
                logger.warning(
                    f"Function class '{func_class_name}' not found in {plugin_id}"
                )

        # 캐시에 저장
        plugin_data = {
            'config': config,
            'device_class': device_class,
            'functions': functions
        }

        self.loaded_plugins[plugin_id] = plugin_data

        logger.info(f"Loaded plugin: {plugin_id} ({len(functions)} functions)")

        return plugin_data

    def reload_plugin(self, plugin_id: str) -> Dict[str, Any]:
        """
        플러그인 리로드 (개발 중)
        """
        # 캐시 삭제
        if plugin_id in self.loaded_plugins:
            del self.loaded_plugins[plugin_id]

        # 모듈 리로드
        importlib.invalidate_caches()

        # 다시 로드
        return self.load_plugin(plugin_id)

    def unload_plugin(self, plugin_id: str):
        """플러그인 언로드"""
        if plugin_id in self.loaded_plugins:
            del self.loaded_plugins[plugin_id]
            logger.info(f"Unloaded plugin: {plugin_id}")

    def _to_class_name(self, func_id: str) -> str:
        """
        함수 ID를 클래스 이름으로 변환

        Example:
            "move_absolute" -> "MoveAbsoluteFunction"
            "get_position" -> "GetPositionFunction"
        """
        parts = func_id.split('_')
        return ''.join(p.capitalize() for p in parts) + 'Function'

    def validate_plugin(self, plugin_path: Path) -> bool:
        """
        플러그인 검증

        Returns:
            True if valid
        """
        # 필수 파일 체크
        required_files = ['__init__.py', 'config.yaml', 'device.py', 'functions.py']

        for filename in required_files:
            if not (plugin_path / filename).exists():
                logger.error(f"Missing required file: {filename} in {plugin_path.name}")
                return False

        # config.yaml 파싱 테스트
        try:
            with open(plugin_path / 'config.yaml', 'r') as f:
                config = yaml.safe_load(f)

            # 필수 키 체크
            assert 'plugin' in config
            assert 'device' in config
            assert 'functions' in config

            return True

        except Exception as e:
            logger.error(f"Invalid config.yaml: {e}")
            return False
```

## 6. 다음 단계

다음 문서에서는 플러그인 개발 가이드를 제공합니다:

- [06-plugin-development-guide.md](./06-plugin-development-guide.md) - 플러그인 개발 방법
