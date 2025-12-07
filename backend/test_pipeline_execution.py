"""Test pipeline execution with events."""

import asyncio
import json
import requests
from datetime import datetime


def create_test_pipeline():
    """Create a simple test pipeline."""
    return {
        "pipeline_id": f"test_pipeline_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        "name": "Test Pipeline with Events",
        "nodes": [
            {
                "id": "device_1",
                "type": "function",
                "device_instance": "servo_1",
                "function_id": "home",
                "config": {}
            },
            {
                "id": "device_2",
                "type": "function",
                "device_instance": "servo_1",
                "function_id": "move_absolute",
                "config": {
                    "position": 100
                }
            },
            {
                "id": "device_3",
                "type": "function",
                "device_instance": "servo_1",
                "function_id": "move_absolute",
                "config": {
                    "position": 0
                }
            }
        ],
        "edges": [
            {
                "source": "device_1",
                "target": "device_2",
                "source_handle": "complete",
                "target_handle": "trigger"
            },
            {
                "source": "device_2",
                "target": "device_3",
                "source_handle": "complete",
                "target_handle": "trigger"
            }
        ],
        "variables": {}
    }


def create_device():
    """Create a test device instance."""
    url = "http://localhost:8000/api/devices"
    payload = {
        "plugin_id": "mock_servo",
        "instance_id": "servo_1",
        "config": {
            "port": "COM3",
            "auto_connect": False
        }
    }

    print("🔧 Creating device instance...")
    response = requests.post(url, json=payload)

    if response.status_code == 200:
        print("✅ Device created successfully!")
        return True
    elif response.status_code == 400 and "already exists" in response.text:
        print("ℹ️  Device already exists")
        return True
    else:
        print(f"❌ Failed to create device: {response.status_code}")
        print(f"   {response.text}")
        return False


def execute_pipeline(pipeline_def):
    """Execute the test pipeline."""
    url = "http://localhost:8000/api/pipelines/execute"
    payload = {
        "pipeline": pipeline_def
    }

    print("\n🚀 Executing pipeline...")
    print(f"   Pipeline ID: {pipeline_def['pipeline_id']}")
    print(f"   Nodes: {len(pipeline_def['nodes'])}")

    response = requests.post(url, json=payload)

    if response.status_code == 200:
        result = response.json()
        print("\n✅ Pipeline execution completed!")
        print(f"   Success: {result.get('success')}")
        print(f"   Nodes executed: {result.get('nodes_executed')}")
        print(f"   Execution time: {result.get('execution_time', 0):.3f}s")

        if result.get('error'):
            print(f"   ⚠️ Error: {result.get('error')}")

        return True
    else:
        print(f"\n❌ Pipeline execution failed: {response.status_code}")
        print(f"   {response.text}")
        return False


def main():
    """Main test function."""
    print("=" * 60)
    print("Pipeline Execution Test (with Event Bus)")
    print("=" * 60)

    # Step 1: Create device
    if not create_device():
        print("\n❌ Test failed: Could not create device")
        return

    # Step 2: Create pipeline
    pipeline = create_test_pipeline()

    # Step 3: Execute pipeline
    print("\n💡 Tip: Run test_websocket.py in another terminal to see events!")
    print("   python test_websocket.py\n")

    input("Press Enter to execute pipeline...")

    if execute_pipeline(pipeline):
        print("\n✅ Test completed successfully!")
    else:
        print("\n❌ Test failed!")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⏹️  Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
