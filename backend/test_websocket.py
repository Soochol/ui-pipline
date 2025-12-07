"""WebSocket connection test script."""

import asyncio
import json
from websockets import connect


async def test_websocket():
    """Test WebSocket connection and events."""
    uri = "ws://localhost:8000/ws"

    print(f"Connecting to {uri}...")

    try:
        async with connect(uri) as websocket:
            print("✅ Connected to WebSocket!")

            # Receive welcome message
            message = await websocket.recv()
            data = json.loads(message)
            print(f"\n📨 Received: {json.dumps(data, indent=2)}")

            # Listen for events for 30 seconds
            print("\n👂 Listening for events (30 seconds)...")
            print("💡 Tip: Execute a pipeline from the frontend or API to see events!\n")

            try:
                async with asyncio.timeout(30):
                    while True:
                        message = await websocket.recv()
                        data = json.loads(message)

                        event_type = data.get("type", "unknown")

                        # Pretty print events
                        if event_type == "pipeline_started":
                            print(f"🚀 Pipeline Started: {data.get('pipeline_name')}")
                        elif event_type == "node_executing":
                            print(f"⚙️  Executing Node: {data.get('node_id')}")
                        elif event_type == "node_completed":
                            exec_time = data.get('execution_time', 0)
                            print(f"✅ Node Completed: {data.get('node_id')} ({exec_time:.3f}s)")
                        elif event_type == "pipeline_completed":
                            total_time = data.get('execution_time', 0)
                            nodes = data.get('nodes_executed', 0)
                            print(f"🎉 Pipeline Completed: {nodes} nodes in {total_time:.3f}s")
                        elif event_type == "pipeline_error":
                            print(f"❌ Pipeline Error: {data.get('error_message')}")
                        else:
                            print(f"📬 Event: {json.dumps(data, indent=2)}")

            except asyncio.TimeoutError:
                print("\n⏱️  Timeout reached (no more events)")

    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    print("=" * 60)
    print("WebSocket Event Listener Test")
    print("=" * 60)
    asyncio.run(test_websocket())
    print("\n✅ Test completed!")
