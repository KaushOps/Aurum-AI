FROM python:3.9-slim

# Install system dependencies (specifically libgomp1 for XGBoost on Linux ARM64)
RUN apt-get update && apt-get install -y \
    libgomp1 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Force stable transformers version to avoid PyTorch version check vulnerabilities on older linux wheels
RUN pip install --no-cache-dir transformers==4.40.0

COPY . .

# Flag to signal to database.py to use the volume mount
ENV DOCKER_ENV=1

# Ensure data directory exists for volume mount
RUN mkdir -p /app/data

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
