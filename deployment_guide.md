# Aurum AI Oracle Cloud Deployment Guide

This guide describes how to pull and deploy the official Aurum AI release onto an Oracle Cloud Ampere A1 (`aarch64`) instance running Docker. 

## Prerequisites
1. Ensure `git` and `docker compose` are installed on your Oracle VM.
2. Ensure you have an empty `8001` port available for Nginx routing.

## 1. Clone the GitHub Release

Access your VM via SSH, then clone the repository:

```bash
git clone https://github.com/KaushOps/Aurum-AI.git
cd Aurum-AI
git fetch --tags
git checkout tags/v1.0.0-oracle -b release-v1
```

## 2. Setup Required Environment Variables

Create the persistent production `.env.production` file to hold your secure SMTP email credentials:

```bash
cat <<EOF > .env.production
SMTP_SERVER=smtp.office365.com  # Or smtp.gmail.com
SMTP_PORT=587
SMTP_USER=k.s.poojari10@hotmail.com
SMTP_PASS=your_app_password_here
EOF
```

## 3. Persistent Data Creation

Ensure the `data` directory exists locally so the XGBoost model outputs and SQLite datasets are preserved through server reboots:

```bash
mkdir -p data
```

## 4. Spin up Aurum AI via Docker Compose

Run the build orchestration daemon. The `docker-compose` build process will automatically pull ARM64-compatible versions of PyTorch and install Linux headers for XGBoost seamlessly.

```bash
docker compose up --build -d
```

## 5. Reverse Proxy Configuration (Swingmaster Side-by-Side)

Aurum AI's frontend is now serving statically on port `8001`.
If you are already running an `nginx` reverse proxy directly on your Oracle VM for Swingmaster, you can simply append a new `server-block` for Aurum AI:

```nginx
server {
    listen 80;
    server_name aurum.kaushops.com; # Your domain

    location / {
        proxy_pass http://localhost:8001;
        proxy_set_header Host $host;
    }
}
```

Then restart your VM's host Nginx: `sudo systemctl reload nginx`.

That's it! Aurum AI is fully live and scheduled to autonomously run intelligence routines every 6 hours persistently!
