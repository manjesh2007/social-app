import os
import pytest
import requests
from dotenv import load_dotenv

load_dotenv('/app/frontend/.env')

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="session")
def base_url():
    assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL not set"
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def alex_token(api_client, base_url):
    r = api_client.post(f"{base_url}/api/auth/login",
                        json={"email": "alex@example.com", "password": "Password123!"})
    assert r.status_code == 200, f"Alex login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def priya_token(api_client, base_url):
    r = api_client.post(f"{base_url}/api/auth/login",
                        json={"email": "priya@example.com", "password": "Password123!"})
    assert r.status_code == 200
    return r.json()["access_token"]


@pytest.fixture
def alex_auth(alex_token):
    return {"Authorization": f"Bearer {alex_token}", "Content-Type": "application/json"}


@pytest.fixture
def priya_auth(priya_token):
    return {"Authorization": f"Bearer {priya_token}", "Content-Type": "application/json"}
