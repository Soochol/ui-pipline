# Plugin Template

이 템플릿을 사용하여 커스텀 디바이스 플러그인을 만들 수 있습니다.

## 사용 방법

1. 이 폴더를 복사하고 이름을 변경합니다 (예: `my_device`)
2. `config.yaml`을 수정하여 플러그인 메타데이터와 함수를 정의합니다
3. `device.py`의 `ExampleDevice` 클래스를 수정하여 실제 하드웨어 통신을 구현합니다
4. `functions.py`의 함수 클래스들을 수정하여 디바이스 기능을 구현합니다

## 파일 구조

```
my_device/
├── config.yaml      # 플러그인 설정 및 메타데이터
├── device.py        # 디바이스 클래스 구현
├── functions.py     # 함수 클래스 구현
└── README.md        # 플러그인 문서
```

## config.yaml 구조

- `plugin`: 플러그인 메타데이터 (id, name, version, author, etc.)
- `device`: 디바이스 클래스 정보 및 설정 파라미터
- `functions`: 함수 정의 목록 (inputs, outputs)

## device.py 구현

`BaseDevice`를 상속받아 다음 메서드를 구현합니다:

- `async connect()`: 디바이스 연결
- `async disconnect()`: 디바이스 연결 해제
- `async health_check()`: 상태 확인
- `get_info()`: 디바이스 정보 반환

## functions.py 구현

각 함수는 `BaseFunction`을 상속받아 다음을 구현합니다:

- `async execute(inputs)`: 함수 실행 로직
- 클래스 이름: `{FunctionId}Function` (예: `ReadValueFunction`)

## 예제

자세한 예제는 `mock_servo` 플러그인을 참조하세요.
