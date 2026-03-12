FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY ../pyproject.toml /app/pyproject.toml

RUN pip install --no-cache-dir uv
RUN uv venv /opt/venv && . /opt/venv/bin/activate && uv sync

ENV PATH="/opt/venv/bin:$PATH"

COPY .. /app

CMD ["python", "-m", "mock.stream_client"]

