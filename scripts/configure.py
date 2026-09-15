from pathlib import Path
import secrets
root=Path(__file__).resolve().parents[1]
p=root/'.env'
if p.exists():
    print('Keeping existing .env')
else:
    password=secrets.token_urlsafe(24)
    s3=secrets.token_urlsafe(32)
    db=secrets.token_urlsafe(24)
    p.write_text(f'''POSTGRES_PASSWORD={db}
DATABASE_URL=postgresql+psycopg://jocky:{db}@127.0.0.1:55432/jocky
REDIS_URL=redis://127.0.0.1:56379/0
S3_ENDPOINT=http://127.0.0.1:59000
S3_ACCESS_KEY=jocky-local
S3_SECRET_KEY={s3}
S3_BUCKET=jocky-evidence
JWT_SECRET={secrets.token_urlsafe(48)}
AGENT_ENROLLMENT_SECRET={secrets.token_urlsafe(32)}
JOCKY_PUBLIC_URL=http://127.0.0.1:3100
ADMIN_EMAIL=admin@jocky.local
ADMIN_PASSWORD={password}
AI_PROVIDER=disabled
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:8b
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=
OPENAI_MODEL=
JOCKY_CLI=target/debug/jocky
''')
    p.chmod(0o600)
    print('Created private .env; local login credentials are in .env')
