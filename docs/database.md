# Database

PostgreSQL with SQLAlchemy models and Alembic migration `0001`. Apply via `PYTHONPATH=apps/api alembic -c apps/api/alembic.ini upgrade head`.

Entities include organizations, users, roles, user_roles, refresh/enrollment tokens, endpoints/sessions/agent_versions, jobs/targets/results, observations and seven typed observation tables, detections/rules, indicators/matches, cases and endpoint/evidence/detection links/notes, evidence/access log, timelines/events, reports, audit logs, AI investigations, scripts/versions, and compiler builds.

Foreign keys preserve entity provenance. Unique job-target and result constraints prevent duplicate target/result creation. Observation hashes are computed over canonical JSON; original result evidence hashes cover exact S3 object bytes. These two hash scopes differ intentionally.

Common query indexes: organization, endpoint, job, collection kind, timestamps, PID, process name, file hash, and network remote IP. Large event payloads remain JSON; typed projections expose common query columns. This is not a full event-sourced or WORM database.

Initial migration builds the metadata model. Before introducing a new schema release, add an explicit versioned migration and freeze previous schema DDL rather than modifying the initial model in place. Audit/custody downgrade intentionally refuses destructive removal.

## Backup

Back up PostgreSQL and MinIO together. A database backup alone cannot recover the original evidence bytes. Keep backups encrypted and outside the VM. Test restore into a separate environment before relying on them.
