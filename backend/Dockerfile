FROM python:3.12-slim

WORKDIR /srv

COPY pyproject.toml ./
COPY app ./app
RUN pip install --no-cache-dir .

# SQLite file lives here by default; mount a volume to persist it.
VOLUME ["/srv/data"]
ENV DATABASE_URL=sqlite:////srv/data/minigotchi.db

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
