# Security model and limitations

## Controls implemented

- No arbitrary remote shell. Fixed job kinds and collector command strings. Runtime rejects unknown functions and limits recursion, steps, output, source, and paths.
- HTTPS for agents; plaintext permitted only for explicitly opted-in loopback development. Redirects disabled; normal certificate validation remains enabled.
- One-hour limited-use enrollment tokens, hashed endpoint credentials, HMAC-signed exact job metadata, endpoint binding, expiry, lease validation and idempotent results.
- Argon2 password hashes, 30-minute JWT access tokens, seven-day rotating refresh tokens, HttpOnly/SameSite browser cookies, origin checking and RBAC enforced in the API.
- Organization ownership enforced when reading or attaching resources. SQLAlchemy parameterized queries. No evidence object key comes directly from a browser request.
- Redis-backed rate limiting, 8-MiB API body bound / 1-MiB browser proxy bound, input validation and security headers.
- Evidence SHA-256, size check, hash-linked custody entries serialized with row locks, append-only database triggers on custody/audit tables.
- HTML report escaping and sandbox content-security policy. Monaco assets served locally.
- Credentials, host observations, local reports and logs excluded from Git.

## Permissions

Admin: all exposed operations. Investigator: scans, evidence, rules, cases, reports. Analyst: stored reads, compiler validation, notes, allowed system/process/network/IOC queries. Viewer: read only. Creating an IOC is an Investigator/Admin write operation in this version. Unsupported attempts return HTTP 403, even if a UI control remains visible.

## Explicit limits of assurance

This is a prototype, not a hardened enterprise endpoint-security product. No penetration-test certification, code signing, MFA, full multi-tenant adversarial audit, HA, disaster-recovery drill, or service installer verification on the owner's Windows PCs has been completed.

A compromised endpoint can lie about collected facts. HMAC authenticates a credential holder; it does not prove the host is uncompromised. Agent clocks can drift; backend receipt and collection timestamps are separate. Process/network snapshot joins use one job to reduce PID reuse errors, but collection is not atomic.

Database administrators and storage administrators can modify or remove data. Hash chains and database triggers make ordinary application mutation harder; they are not externally notarized WORM storage. MinIO and PostgreSQL volumes are local, not encrypted by the application; configure encrypted disks and managed key controls in production. Take independent backups.

Logout revokes refresh credentials and clears browser cookies. A stolen access token can remain valid for up to 30 minutes. Credential rotation/revocation beyond endpoint disable is not a complete enterprise lifecycle.

Command-line collection is disabled because commands can contain secrets. Turning it on (`JOCKY_COLLECT_COMMAND_LINES=1`) is an explicit endpoint configuration choice. File paths are canonicalized and symlink children are skipped; a hostile local user with write access can still race file metadata/content reads. Do not treat this prototype as a hostile-kernel acquisition tool.

AI context is untrusted and sent only on an explicit query to the configured provider. Valid reference IDs do not guarantee the model's interpretation is correct. Generated scripts are validated and never automatically run.

Unsupported fields, missing permissions, and partial scans remain visible. No permission elevation or security bypass is used to manufacture a clean demo.
