import os, sys, json, secrets, hmac, hashlib
from datetime import timedelta
import pytest
from sqlalchemy import select, text
from fastapi.testclient import TestClient

sys.path.insert(0, "apps/api")
from jocky.main import app
from jocky.db import *
from jocky.security import passwords, digest
from jocky.services import s3, settings, cache


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def identities(client):
    with Session() as db:
        org = Organization(name="Isolated automated test " + uid())
        other = Organization(name="Other test org " + uid())
        db.add_all([org, other])
        db.flush()
        users = {}
        for role in ["Admin", "Investigator", "Analyst", "Viewer", "Other"]:
            pw = secrets.token_urlsafe(20)
            u = User(
                org_id=other.id if role == "Other" else org.id,
                email=uid() + "@test.invalid",
                password_hash=passwords.hash(pw),
            )
            db.add(u)
            db.flush()
            db.add(UserRole(user_id=u.id, role="Admin" if role == "Other" else role))
            users[role] = (u.email, pw)
        db.commit()
    out = {}
    for role, (email, pw) in users.items():
        r = client.post("/api/auth/login", json={"email": email, "password": pw})
        assert r.status_code == 200, r.text
        out[role] = r.json()
    return out


def auth(ids, role="Admin"):
    return {"Authorization": "Bearer " + ids[role]["access_token"]}


@pytest.fixture(scope="module")
def endpoint(client, identities):
    r = client.post("/api/enrollments", json={"uses": 1}, headers=auth(identities))
    assert r.status_code == 200, r.text
    payload = {
        "token": r.json()["token"],
        "hostname": "JOCKY TEST FIXTURE",
        "os": "windows",
        "architecture": "x86_64",
        "agent_version": "0.1.0",
    }
    r = client.post("/api/agent/enroll", json=payload)
    assert r.status_code == 200, r.text
    assert client.post("/api/agent/enroll", json=payload).status_code == 401
    return r.json()


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "healthy", r.text


def test_auth_and_roles(client, identities, endpoint):
    assert client.get("/api/endpoints").status_code == 401
    assert (
        client.post(
            "/api/enrollments", json={"uses": 1}, headers=auth(identities, "Viewer")
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/jobs",
            json={"kind": "quick", "endpoint_ids": [endpoint["endpoint_id"]]},
            headers=auth(identities, "Viewer"),
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/jobs",
            json={
                "kind": "script",
                "endpoint_ids": [endpoint["endpoint_id"]],
                "params": {"source": "hunt x {report processes() }"},
            },
            headers=auth(identities, "Analyst"),
        ).status_code
        == 403
    )
    assert (
        client.get(
            "/api/endpoints/" + endpoint["endpoint_id"],
            headers=auth(identities, "Other"),
        ).status_code
        == 404
    )
    assert (
        client.post(
            "/api/jobs",
            json={"kind": "quick", "endpoint_ids": [endpoint["endpoint_id"]]},
            headers=auth(identities, "Other"),
        ).status_code
        == 404
    )
    assert (
        client.post(
            "/api/jobs",
            json={"kind": "shell", "endpoint_ids": [endpoint["endpoint_id"]]},
            headers=auth(identities),
        ).status_code
        == 422
    )


def test_refresh_rotation(client, identities):
    token = identities["Viewer"]["refresh_token"]
    r = client.post("/api/auth/refresh", json={"refresh_token": token})
    assert r.status_code == 200
    assert (
        client.post("/api/auth/refresh", json={"refresh_token": token}).status_code
        == 401
    )


def test_job_to_evidence_and_case(client, identities, endpoint):
    a = auth(identities)
    agent = {"Authorization": "Bearer " + endpoint["credential"]}
    r = client.post(
        "/api/agent/heartbeat",
        headers=agent,
        json={"agent_version": "0.1.0", "user": "fixture-user"},
    )
    assert r.status_code == 200, r.text
    r = client.post(
        "/api/jobs",
        headers=a,
        json={"kind": "quick", "endpoint_ids": [endpoint["endpoint_id"]]},
    )
    assert r.status_code == 200, r.text
    job = r.json()
    envelopes = client.post("/api/agent/poll", headers=agent, json={}).json()
    assert len(envelopes) == 1
    env = envelopes[0]
    assert hmac.compare_digest(
        env["signature"],
        hmac.new(
            endpoint["credential"].encode(), env["payload"].encode(), hashlib.sha256
        ).hexdigest(),
    )
    j = json.loads(env["payload"])
    target = j["target_id"]
    lease = {"lease_id": j["lease_id"]}
    assert (
        client.post(
            f"/api/agent/jobs/{target}/start", json={"lease_id": "wrong"}, headers=agent
        ).status_code
        == 409
    )
    assert (
        client.post(
            f"/api/agent/jobs/{target}/start", json=lease, headers=agent
        ).status_code
        == 200
    )
    source = 'rule word { when: process.name == "powershell.exe" and process.parent.name == "winword.exe" severity: high message: "JOCKY TEST FIXTURE: Word launched PowerShell" }'
    assert (
        client.post(
            "/api/rules",
            headers=a,
            json={"name": "fixture rule", "format": "jocky", "source": source},
        ).status_code
        == 200
    )
    body = {
        **lease,
        "observations": [
            {
                "kind": "process",
                "collector": "windows.process",
                "collected_at": now().isoformat(),
                "source": "JOCKY TEST FIXTURE (synthetic)",
                "data": {
                    "pid": 1234,
                    "name": "powershell.exe",
                    "parent_pid": 1233,
                    "parent": {"name": "winword.exe"},
                    "demo": True,
                },
            }
        ],
        "errors": [],
    }
    r = client.post(f"/api/agent/jobs/{target}/result", json=body, headers=agent)
    assert r.status_code == 200, r.text
    summary = r.json()
    assert summary["detections"] == 1
    assert (
        client.post(f"/api/agent/jobs/{target}/result", json=body, headers=agent).json()
        == summary
    )
    e = summary["evidence_id"]
    r = client.post(f"/api/evidence/{e}/verify", json={}, headers=a)
    assert r.json()["integrity"] == "verified"
    data = client.get("/api/endpoints/" + endpoint["endpoint_id"], headers=a).json()
    assert data["risk"]["score"] == 25
    obs = client.get("/api/observations", headers=a).json()["items"]
    assert len(obs) == 1
    assert obs[0]["job_id"] == job["id"]
    assert obs[0]["source"].endswith("(synthetic)")
    assert len(client.get("/api/timeline", headers=a).json()) == 1
    c = client.post(
        "/api/cases",
        headers=a,
        json={"title": "JOCKY TEST CASE", "description": "Synthetic test only"},
    ).json()
    case = c["id"]
    detection = client.get("/api/detections", headers=a).json()[0]
    for kind, id in [
        ("endpoint", endpoint["endpoint_id"]),
        ("evidence", e),
        ("detection", detection["id"]),
    ]:
        assert (
            client.post(
                f"/api/cases/{case}/attach", headers=a, json={"kind": kind, "id": id}
            ).status_code
            == 200
        )
    assert (
        client.post(
            f"/api/cases/{case}/notes",
            headers=auth(identities, "Analyst"),
            json={"body": "Test note <script>alert(1)</script>"},
        ).status_code
        == 200
    )
    report = client.post(f"/api/cases/{case}/report", json={}, headers=a)
    assert report.status_code == 200, report.text
    markup = client.get("/api/reports/" + report.json()["id"] + "/html", headers=a).text
    assert "&lt;script&gt;" in markup
    assert "<script>alert(1)</script>" not in markup
    assert (
        client.get(
            f"/api/evidence/{e}/download", headers=auth(identities, "Other")
        ).status_code
        == 404
    )
    logs = client.get(f"/api/evidence/{e}/custody", headers=a).json()
    previous = "0" * 64
    for l in logs:
        assert l["previous_hash"] == previous
        from datetime import datetime

        stamp = datetime.fromisoformat(l["created_at"]).isoformat()
        assert l["entry_hash"] == digest(
            json.dumps(
                [l["id"], e, l["actor"], l["action"], stamp, previous],
                separators=(",", ":"),
            )
        )
        previous = l["entry_hash"]
    with Session() as db:
        record = db.get(Evidence, e)
        s3.put_object(
            Bucket=settings.s3_bucket,
            Key=record.object_key,
            Body=b"JOCKY TEST TAMPER FIXTURE",
        )
    assert (
        client.post(f"/api/evidence/{e}/verify", json={}, headers=a).json()["integrity"]
        == "modified"
    )
    r = client.patch(
        "/api/detections/" + detection["id"], json={"status": "resolved"}, headers=a
    )
    assert r.status_code == 200
    assert (
        client.get("/api/endpoints/" + endpoint["endpoint_id"], headers=a).json()[
            "risk"
        ]["score"]
        == 0
    )


def test_ioc_idempotency_and_rules(client, identities):
    a = auth(identities)
    assert (
        client.post(
            "/api/indicators", headers=a, json={"type": "ip", "value": "invalid"}
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/indicators", headers=a, json={"type": "hash", "value": "123"}
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/indicators",
            headers=a,
            json={"type": "filename", "value": "powershell.exe"},
        ).status_code
        == 200
    )
    assert (
        client.post("/api/indicators/hunt", headers=a, json={}).json()["new_detections"]
        == 1
    )
    assert (
        client.post("/api/indicators/hunt", headers=a, json={}).json()["new_detections"]
        == 0
    )
    unsupported = "title: Test\nlogsource: {product: windows}\ndetection:\n  selection:\n    Image|endswith: powershell.exe\n  condition: selection"
    r = client.post(
        "/api/rules",
        headers=a,
        json={"name": "unsupported Sigma", "format": "sigma", "source": unsupported},
    )
    assert r.status_code == 200
    assert not r.json()["enabled"]
    assert (
        client.post(
            "/api/rules/" + r.json()["id"] + "/toggle", headers=a, json={}
        ).status_code
        == 422
    )


def test_compiler_and_ai_disabled(client, identities, endpoint):
    a = auth(identities)
    assert (
        client.post(
            "/api/compiler/check",
            headers=a,
            json={"source": 'hunt x {report shell("id")}'},
        ).status_code
        == 422
    )
    for mode in ["check", "ast", "tokens", "fmt"]:
        r = client.post(
            "/api/compiler/" + mode,
            headers=a,
            json={"source": "hunt x { p = processes() report p }"},
        )
        assert r.status_code == 200, r.text
    r = client.post(
        "/api/compiler-lab", headers=a, json={"source": "hunt x {report system()}"}
    )
    assert r.status_code == 200
    assert r.json()["equivalent"]
    assert r.json()["source_hash"] != r.json()["alternate_hash"]
    if settings.ai_provider == "disabled":
        assert (
            client.post(
                "/api/ai/investigate",
                headers=a,
                json={
                    "question": "What happened?",
                    "endpoint_id": endpoint["endpoint_id"],
                },
            ).status_code
            == 503
        )


def test_audit_is_append_only(client, identities):
    from sqlalchemy.exc import DBAPIError

    with Session() as db:
        row = db.scalar(select(AuditLog).limit(1))
        assert row
        with pytest.raises(DBAPIError):
            db.execute(
                text("UPDATE audit_logs SET action=:action WHERE id=:id"),
                {"action": "tamper", "id": row.id},
            )
            db.commit()
        db.rollback()


def test_websocket_ticket(client, identities):
    ticket = client.post("/api/ws-ticket", headers=auth(identities)).json()["ticket"]
    with client.websocket_connect(
        "/ws", headers={"origin": settings.jocky_public_url}
    ) as ws:
        ws.send_json({"ticket": ticket})
        assert ws.receive_json()["event"] == "connected"
    assert cache.get("ws:" + digest(ticket)) is None


@pytest.mark.parametrize(
    "errors, expected", [([], "completed"), (["Collector unavailable"], "failed")]
)
def test_empty_collection_outcome(client, identities, endpoint, errors, expected):
    """A successful query with no matches must not look like a collector failure."""
    admin = auth(identities)
    agent = {"Authorization": "Bearer " + endpoint["credential"]}
    created = client.post(
        "/api/jobs",
        headers=admin,
        json={"kind": "quick", "endpoint_ids": [endpoint["endpoint_id"]]},
    )
    assert created.status_code == 200, created.text
    job_id = created.json()["id"]
    envelope = client.post("/api/agent/poll", headers=agent, json={}).json()[0]
    dispatched = json.loads(envelope["payload"])
    target = dispatched["target_id"]
    lease = {"lease_id": dispatched["lease_id"]}
    assert (
        client.post(
            f"/api/agent/jobs/{target}/start", headers=agent, json=lease
        ).status_code
        == 200
    )
    result = client.post(
        f"/api/agent/jobs/{target}/result",
        headers=agent,
        json={**lease, "observations": [], "errors": errors},
    )
    assert result.status_code == 200, result.text
    job = next(
        j for j in client.get("/api/jobs", headers=admin).json() if j["id"] == job_id
    )
    assert job["targets"][0]["state"] == expected
