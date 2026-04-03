import os
from qdrant_client import QdrantClient
from qdrant_client.http import models
import requests

host = "965eec3e-2095-4443-bc81-ea13ba941fa7.europe-west3-0.gcp.cloud.qdrant.io"
api_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.nLS_Qtgxq9Kpf5DJ3thPQLUbSV9vQdAYH0Ptuktod3E"

def test_raw_http(url):
    print(f"Testing raw HTTP GET {url}...")
    try:
        r = requests.get(url, headers={"api-key": api_key}, timeout=5)
        print(f"  Result: {r.status_code} - {r.text[:100]}")
    except Exception as e:
        print(f"  Error: {e}")

def test_conn(name, **kwargs):
    print(f"Testing {name} with args {kwargs}...")
    try:
        kwargs['check_compatibility'] = False
        client = QdrantClient(**kwargs)
        collections = client.get_collections()
        print(f"  SUCCESS: Found {len(collections.collections)} collections")
        return True
    except Exception as e:
        print(f"  FAILED: {e}")
        return False

# 1. Raw HTTP tests
test_raw_http(f"https://{host}/version")
test_raw_http(f"https://{host}:6333/version")
test_raw_http(f"https://{host}:6333/v1/collections")

# 2. Client tests
test_conn("HTTPS Cluster URL (no port)", url=f"https://{host}", api_key=api_key)
test_conn("HTTPS Cluster URL (port 6333)", url=f"https://{host}:6333", api_key=api_key)
test_conn("Host/Port 6333 HTTPS", host=host, port=6333, https=True, api_key=api_key)
test_conn("gRPC 6334", host=host, port=6334, api_key=api_key, prefer_grpc=True)
