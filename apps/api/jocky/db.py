import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    create_engine,
    String,
    DateTime,
    JSON,
    ForeignKey,
    Text,
    Integer,
    Boolean,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker
from .config import settings


def now():
    return datetime.now(timezone.utc)


def uid():
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class Record:
    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=uid)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now, index=True
    )


class Organization(Record, Base):
    __tablename__ = "organizations"
    name: Mapped[str]


class Role(Base):
    __tablename__ = "roles"
    name: Mapped[str] = mapped_column(String(30), primary_key=True)


class User(Record, Base):
    __tablename__ = "users"
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str]


class UserRole(Base):
    __tablename__ = "user_roles"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), primary_key=True)
    role: Mapped[str] = mapped_column(ForeignKey("roles.name"), primary_key=True)


class RefreshToken(Record, Base):
    __tablename__ = "refresh_tokens"
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)


class Enrollment(Record, Base):
    __tablename__ = "enrollment_tokens"
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"))
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    remaining: Mapped[int] = mapped_column(Integer, default=1)


class Endpoint(Record, Base):
    __tablename__ = "endpoints"
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    hostname: Mapped[str]
    os: Mapped[str]
    architecture: Mapped[str]
    agent_version: Mapped[str]
    credential_hash: Mapped[str] = mapped_column(String(64), unique=True)
    last_seen: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    info: Mapped[dict] = mapped_column(JSON, default=dict)
    demo: Mapped[bool] = mapped_column(Boolean, default=False)
    disabled: Mapped[bool] = mapped_column(Boolean, default=False)


class EndpointSession(Record, Base):
    __tablename__ = "endpoint_sessions"
    endpoint_id: Mapped[str] = mapped_column(ForeignKey("endpoints.id"))
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)


class AgentVersion(Record, Base):
    __tablename__ = "agent_versions"
    version: Mapped[str] = mapped_column(unique=True)
    notes: Mapped[str]


class Job(Record, Base):
    __tablename__ = "jobs"
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    kind: Mapped[str]
    params: Mapped[dict] = mapped_column(JSON, default=dict)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class JobTarget(Record, Base):
    __tablename__ = "job_targets"
    __table_args__ = (UniqueConstraint("job_id", "endpoint_id"),)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id"), index=True)
    endpoint_id: Mapped[str] = mapped_column(ForeignKey("endpoints.id"), index=True)
    state: Mapped[str] = mapped_column(default="queued")
    attempts: Mapped[int] = mapped_column(default=0)
    lease_id: Mapped[str | None]
    lease_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error: Mapped[str | None] = mapped_column(Text)


class JobResult(Record, Base):
    __tablename__ = "job_results"
    target_id: Mapped[str] = mapped_column(ForeignKey("job_targets.id"), unique=True)
    summary: Mapped[dict] = mapped_column(JSON)


class Observation(Record, Base):
    __tablename__ = "observations"
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    endpoint_id: Mapped[str] = mapped_column(ForeignKey("endpoints.id"), index=True)
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id"), index=True)
    collector: Mapped[str]
    collected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    source: Mapped[str]
    agent_version: Mapped[str]
    kind: Mapped[str] = mapped_column(index=True)
    data: Mapped[dict] = mapped_column(JSON)
    sha256: Mapped[str]


# Native typed tables maintain normalized observation identity and searchable projections.
class ProcessObservation(Base):
    __tablename__ = "process_observations"
    observation_id: Mapped[str] = mapped_column(
        ForeignKey("observations.id"), primary_key=True
    )
    pid: Mapped[int | None] = mapped_column(Integer, index=True)
    parent_pid: Mapped[int | None] = mapped_column(Integer)
    name: Mapped[str | None] = mapped_column(String(1024), index=True)


class NetworkObservation(Base):
    __tablename__ = "network_observations"
    observation_id: Mapped[str] = mapped_column(
        ForeignKey("observations.id"), primary_key=True
    )
    remote_ip: Mapped[str | None] = mapped_column(String(256), index=True)
    remote_port: Mapped[int | None] = mapped_column(Integer)


class FileObservation(Base):
    __tablename__ = "file_observations"
    observation_id: Mapped[str] = mapped_column(
        ForeignKey("observations.id"), primary_key=True
    )
    path: Mapped[str | None] = mapped_column(Text)
    sha256: Mapped[str | None] = mapped_column(String(64), index=True)


class PersistenceObservation(Base):
    __tablename__ = "persistence_observations"
    observation_id: Mapped[str] = mapped_column(
        ForeignKey("observations.id"), primary_key=True
    )
    mechanism: Mapped[str | None]


class DriverObservation(Base):
    __tablename__ = "driver_observations"
    observation_id: Mapped[str] = mapped_column(
        ForeignKey("observations.id"), primary_key=True
    )
    name: Mapped[str | None]


class SystemObservation(Base):
    __tablename__ = "system_observations"
    observation_id: Mapped[str] = mapped_column(
        ForeignKey("observations.id"), primary_key=True
    )
    hostname: Mapped[str | None]


class LogObservation(Base):
    __tablename__ = "log_observations"
    observation_id: Mapped[str] = mapped_column(
        ForeignKey("observations.id"), primary_key=True
    )
    event_type: Mapped[str | None] = mapped_column(index=True)


class DetectionRule(Record, Base):
    __tablename__ = "detection_rules"
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    name: Mapped[str]
    format: Mapped[str]
    source: Mapped[str] = mapped_column(Text)
    enabled: Mapped[bool] = mapped_column(default=True)
    compiled: Mapped[dict] = mapped_column(JSON, default=dict)


class Detection(Record, Base):
    __tablename__ = "detections"
    __table_args__ = (UniqueConstraint("observation_id", "fingerprint"),)
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    endpoint_id: Mapped[str] = mapped_column(ForeignKey("endpoints.id"), index=True)
    observation_id: Mapped[str] = mapped_column(ForeignKey("observations.id"))
    fingerprint: Mapped[str]
    title: Mapped[str]
    severity: Mapped[str]
    status: Mapped[str] = mapped_column(default="new")
    score: Mapped[int] = mapped_column(Integer)
    details: Mapped[dict] = mapped_column(JSON, default=dict)


class Indicator(Record, Base):
    __tablename__ = "indicators"
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    type: Mapped[str]
    value: Mapped[str]
    description: Mapped[str]
    severity: Mapped[str]
    source: Mapped[str]
    tags: Mapped[list] = mapped_column(JSON, default=list)


class IndicatorMatch(Record, Base):
    __tablename__ = "indicator_matches"
    __table_args__ = (UniqueConstraint("indicator_id", "observation_id"),)
    indicator_id: Mapped[str] = mapped_column(ForeignKey("indicators.id"))
    observation_id: Mapped[str] = mapped_column(ForeignKey("observations.id"))


class Case(Record, Base):
    __tablename__ = "cases"
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    title: Mapped[str]
    description: Mapped[str]
    severity: Mapped[str]
    status: Mapped[str] = mapped_column(default="open")
    assigned_to: Mapped[str] = mapped_column(ForeignKey("users.id"))


class CaseEndpoint(Base):
    __tablename__ = "case_endpoints"
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), primary_key=True)
    endpoint_id: Mapped[str] = mapped_column(
        ForeignKey("endpoints.id"), primary_key=True
    )


class CaseDetection(Base):
    __tablename__ = "case_detections"
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), primary_key=True)
    detection_id: Mapped[str] = mapped_column(
        ForeignKey("detections.id"), primary_key=True
    )


class CaseNote(Record, Base):
    __tablename__ = "case_notes"
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text)


class Evidence(Record, Base):
    __tablename__ = "evidence"
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    endpoint_id: Mapped[str] = mapped_column(ForeignKey("endpoints.id"))
    job_id: Mapped[str] = mapped_column(ForeignKey("jobs.id"))
    collector: Mapped[str]
    object_key: Mapped[str] = mapped_column(unique=True)
    sha256: Mapped[str]
    size: Mapped[int]
    integrity: Mapped[str] = mapped_column(default="unchecked")


class CaseEvidence(Base):
    __tablename__ = "case_evidence"
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"), primary_key=True)
    evidence_id: Mapped[str] = mapped_column(
        ForeignKey("evidence.id"), primary_key=True
    )


class EvidenceAccessLog(Record, Base):
    __tablename__ = "evidence_access_log"
    evidence_id: Mapped[str] = mapped_column(ForeignKey("evidence.id"), index=True)
    actor: Mapped[str]
    action: Mapped[str]
    previous_hash: Mapped[str]
    entry_hash: Mapped[str]


class Timeline(Record, Base):
    __tablename__ = "timelines"
    endpoint_id: Mapped[str] = mapped_column(ForeignKey("endpoints.id"), unique=True)


class TimelineEvent(Record, Base):
    __tablename__ = "timeline_events"
    timeline_id: Mapped[str] = mapped_column(ForeignKey("timelines.id"), index=True)
    observation_id: Mapped[str] = mapped_column(
        ForeignKey("observations.id"), unique=True
    )
    event_type: Mapped[str]
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


class Report(Record, Base):
    __tablename__ = "reports"
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"))
    case_id: Mapped[str] = mapped_column(ForeignKey("cases.id"))
    html: Mapped[str] = mapped_column(Text)
    sha256: Mapped[str]


class AuditLog(Record, Base):
    __tablename__ = "audit_logs"
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), index=True)
    actor: Mapped[str]
    action: Mapped[str]
    resource: Mapped[str]
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)


class AIInvestigation(Record, Base):
    __tablename__ = "ai_investigations"
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"))
    question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)
    references: Mapped[list] = mapped_column(JSON)
    provider: Mapped[str]


class JockyScript(Record, Base):
    __tablename__ = "jocky_scripts"
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"))
    name: Mapped[str]


class JockyScriptVersion(Record, Base):
    __tablename__ = "jocky_script_versions"
    script_id: Mapped[str] = mapped_column(ForeignKey("jocky_scripts.id"))
    source: Mapped[str] = mapped_column(Text)
    sha256: Mapped[str]


class CompilerBuild(Record, Base):
    __tablename__ = "compiler_builds"
    org_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"))
    source_hash: Mapped[str]
    alternate_hash: Mapped[str]
    equivalent: Mapped[bool]
    details: Mapped[dict] = mapped_column(JSON)


engine = create_engine(settings.database_url, pool_pre_ping=True)
Session = sessionmaker(engine, expire_on_commit=False)


def get_db():
    with Session() as db:
        yield db
