"""Check a deployed HTTPS dashboard without printing credentials or cookies."""

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import httpx

parser = argparse.ArgumentParser()
parser.add_argument("--url", required=True)
parser.add_argument("--credentials-file", type=Path, required=True)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
if not args.url.startswith("https://"):
    parser.error("Cloud verification requires HTTPS with certificate verification.")
credentials = json.loads(args.credentials_file.read_text())
checks = []


def passed(name, detail=None):
    checks.append({"check": name, "status": "passed", "detail": detail})
    print("PASS:", name, flush=True)


with httpx.Client(base_url=args.url, timeout=30, follow_redirects=False) as client:
    response = client.get("/")
    response.raise_for_status()
    assert "JOCKY" in response.text, "Expected JOCKY dashboard HTML"
    assert "max-age=" in response.headers.get("strict-transport-security", "")
    passed("Public dashboard and trusted HTTPS")
    response = client.get("/api/health")
    response.raise_for_status()
    assert response.json()["status"] == "healthy", response.json()
    passed("API and backing services healthy", response.json())
    assert client.get("/api/endpoints").status_code == 401
    passed("Anonymous requests cannot read endpoints")
    response = client.post(
        "/api/auth/login",
        json={"email": credentials["email"], "password": credentials["password"]},
        headers={"Origin": args.url.rstrip("/")},
    )
    response.raise_for_status()
    assert response.json()["user"]["role"] == "Admin"
    assert "access_token" not in response.json()
    cookies = response.headers.get_list("set-cookie")
    assert len(cookies) >= 2
    for cookie in cookies:
        lower = cookie.lower()
        assert "; secure" in lower, "Session cookie missing Secure"
        assert "; httponly" in lower, "Session cookie missing HttpOnly"
        assert "samesite=strict" in lower, "Session cookie missing SameSite=Strict"
    passed("Admin login sets protected session cookies")
    for path in ["endpoints", "jobs", "detections", "cases", "evidence"]:
        response = client.get("/api/" + path)
        response.raise_for_status()
        passed("Authenticated " + path)
    assert client.post(
        "/api/auth/logout", json={}, headers={"Origin": "https://invalid.example"}
    ).status_code == 403
    passed("Unexpected browser origin rejected")
    client.post(
        "/api/auth/logout", json={}, headers={"Origin": args.url.rstrip("/")}
    ).raise_for_status()
    assert client.get("/api/endpoints").status_code == 401
    passed("Logout removes browser access")

args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps({"url": args.url, "checked_at": datetime.now(timezone.utc).isoformat(), "checks": checks}, indent=2))
args.output.chmod(0o600)
print("Saved verification results:", args.output)
