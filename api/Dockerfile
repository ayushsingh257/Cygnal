# Stage 1: Build compiled requirements
FROM python:3.13-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Runtime image
FROM python:3.13-slim AS runtime

WORKDIR /app

# Install runtime dependencies (libpq5 for PostgreSQL client, nmap for nmap scanner)
RUN apt-get update && apt-get install -y \
    libpq5 \
    nmap \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /root/.local /root/.local
COPY . .

ENV PATH=/root/.local/bin:$PATH
ENV FLASK_APP=backend.py
ENV FLASK_ENV=production

EXPOSE 5000

CMD ["python", "backend.py"]
