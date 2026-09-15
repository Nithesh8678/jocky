"""Initial normalized forensic schema."""

from alembic import op
from jocky.db import Base

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    Base.metadata.create_all(bind=op.get_bind())
    # Append-only audit and custody logs; the database rejects mutation even if API code regresses.
    op.execute(
        "CREATE FUNCTION jocky_reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'JOCKY audit records are append-only'; END $$"
    )
    for table in ["audit_logs", "evidence_access_log"]:
        op.execute(
            f"CREATE TRIGGER immutable_audit BEFORE UPDATE OR DELETE ON {table} FOR EACH ROW EXECUTE FUNCTION jocky_reject_audit_mutation()"
        )


def downgrade():
    raise RuntimeError(
        "Destructive audit downgrade is intentionally unavailable; restore an explicit database backup instead"
    )
