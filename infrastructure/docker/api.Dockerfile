FROM rust:1.98-bookworm AS compiler
WORKDIR /src
COPY Cargo.toml Cargo.lock ./
COPY crates ./crates
RUN cargo build --release --locked -p jocky-cli
FROM python:3.12-slim-bookworm
WORKDIR /app
COPY apps/api/requirements.lock.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt && useradd --uid 10001 --create-home jocky
COPY --from=compiler /src/target/release/jocky /usr/local/bin/jocky
COPY apps/api ./apps/api
ENV PYTHONPATH=/app/apps/api
USER 10001
CMD ["sh", "-c", "alembic -c apps/api/alembic.ini upgrade head && uvicorn jocky.main:app --host 0.0.0.0 --port 8000"]
