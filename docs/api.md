# API reference

Open `/docs` on the API listener for the complete generated OpenAPI schema. Browser sessions go through Next.js `/api/*`; agents use the API listener or reverse-proxied `/api/agent/*`.

| API | Meaning |
|---|---|
| GET /health | PostgreSQL, Redis, evidence-storage and compiler checks |
| POST /api/auth/login | Email/password → access token and refresh token |
| POST /api/auth/refresh | Atomically rotate refresh token |
| GET /api/auth/me | Current authenticated identity/role |
| POST /api/enrollments | Admin creates a limited-use enrollment token |
| POST /api/agent/enroll | Exchange enrollment for endpoint identity |
| POST /api/agent/heartbeat | Authenticated endpoint state |
| POST /api/agent/poll | Claim one signed leased job |
| POST /api/agent/jobs/{target}/start | Enter running state with lease |
| POST /api/agent/jobs/{target}/result | Idempotent bounded result ingestion |
| GET/POST /api/jobs | View or dispatch collection jobs |
| POST /api/jobs/{id}/cancel | Cancel queued/in-flight result acceptance |
| GET /api/observations | Filter endpoint/kind; paginated 100 by default, maximum 500 |
| PATCH /api/detections/{id} | Detection state updates use PATCH; list at /detections |
| GET/POST /api/indicators | Manage IOCs |
| POST /api/indicators/hunt | Match stored observations, deduplicated |
| GET/POST /api/rules | Store native or Sigma rules |
| GET/POST /api/cases | Create/list cases |
| POST /api/cases/{id}/attach | Attach owned endpoint/evidence/detection |
| POST /api/cases/{id}/notes | Add analyst notes |
| POST /api/cases/{id}/report | Generate escaped HTML report |
| GET /api/evidence | Evidence metadata |
| POST /api/evidence/{id}/verify | Recompute fingerprint of original stored object |
| GET /api/evidence/{id}/custody | View chain of custody (records the view) |
| GET /api/evidence/{id}/download | Authenticated original download |
| POST /api/evidence/{id}/yara | Optional YARA on explicitly selected evidence only |
| POST /api/compiler/{check,ast,tokens,fmt} | Compilation tools, no collection |
| POST /api/compiler-lab | AST serialization equivalence experiment |
| POST /api/ai/investigate | Explicit evidence-context AI query, if configured |
| POST /api/ws-ticket | Single-use ticket, 30-second lifetime |
| WS /ws | First message `{ticket: ...}`; organization-scoped live events |

The API accepts `Authorization: Bearer ...`; credentials should never go in URLs. Collection jobs support explicit endpoint IDs or `all_endpoints`, not dynamic endpoint groups in this version.

Jobs use UTC-aware timestamps. Error responses use `detail`. Partial collector failures appear in `summary.errors` and target.error; a completed target can still have degraded coverage.
