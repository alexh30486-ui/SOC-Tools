# Build from the repo root:  docker build -f api/Dockerfile .   (docker-compose.yml does this for you)
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 SPEC_STATIC_DIR=/app/web
RUN useradd --create-home --uid 10001 spec
WORKDIR /app
COPY api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY api/schema.sql ./schema.sql
COPY api/spec_api ./spec_api
COPY samples ./samples
COPY web/index.html ./web/index.html
USER spec
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8080/v1/health',timeout=2).status==200 else 1)"
CMD ["python", "-m", "spec_api.server"]
