#!/usr/bin/env python3
"""
Test script for ReefVision FastAPI endpoints using FastAPI TestClient.
"""

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app


def test_endpoints():
    client = TestClient(app)

    print("Testing /api/health...")
    resp = client.get("/api/health")
    assert resp.status_code == 200, f"Health failed: {resp.text}"
    health = resp.json()
    print(f"  Status: {health['status']}, active device: {health['device']['device']}")

    print("Testing /api/models/status...")
    resp = client.get("/api/models/status")
    assert resp.status_code == 200, f"Models status failed: {resp.text}"
    models = resp.json()
    print(f"  All models downloaded: {models['all_downloaded']}, model count: {len(models['models'])}")

    print("Testing /api/samples...")
    resp = client.get("/api/samples")
    assert resp.status_code == 200, f"Samples failed: {resp.text}"
    samples = resp.json()
    print(f"  Found {len(samples)} samples.")
    if samples:
        print(f"  First sample: {samples[0]['filename']}")

    print("Testing /api/device/select across hardware priority tiers...")
    # Tier 1: GPU
    resp = client.post("/api/device/select", json={"preference": "gpu"})
    assert resp.status_code == 200, f"Device select (gpu) failed: {resp.text}"
    dev_gpu = resp.json()
    print(f"  GPU select -> mode: {dev_gpu.get('mode')}, provider: {dev_gpu.get('device')}, label: {dev_gpu.get('mode_label')}")

    # Tier 2: Multi-Threaded CPU
    resp = client.post("/api/device/select", json={"preference": "multithread_cpu"})
    assert resp.status_code == 200, f"Device select (multithread_cpu) failed: {resp.text}"
    dev_mt = resp.json()
    assert dev_mt.get("mode") == "multithread_cpu", f"Expected multithread_cpu, got {dev_mt.get('mode')}"
    print(f"  Multi-thread CPU select -> mode: {dev_mt.get('mode')}, threads: {dev_mt.get('threads')}, label: {dev_mt.get('gpu_name')}")

    # Tier 3: Single-Threaded CPU
    resp = client.post("/api/device/select", json={"preference": "cpu"})
    assert resp.status_code == 200, f"Device select (cpu) failed: {resp.text}"
    dev_cpu = resp.json()
    assert dev_cpu.get("mode") == "cpu", f"Expected cpu, got {dev_cpu.get('mode')}"
    assert dev_cpu.get("threads") == 1, f"Expected 1 thread for single-threaded CPU, got {dev_cpu.get('threads')}"
    print(f"  Single-thread CPU select -> mode: {dev_cpu.get('mode')}, threads: {dev_cpu.get('threads')}, label: {dev_cpu.get('gpu_name')}")

    # Auto mode resolution (GPU -> Multi-threaded CPU -> CPU)
    resp = client.post("/api/device/select", json={"preference": "auto"})
    assert resp.status_code == 200, f"Device select (auto) failed: {resp.text}"
    dev_auto = resp.json()
    print(f"  Auto select -> mode: {dev_auto.get('mode')}, priority: {dev_auto.get('priority')}, active: {dev_auto.get('gpu_name')}")

    print("\nAll API endpoint unit tests PASSED successfully!")


if __name__ == "__main__":
    test_endpoints()
