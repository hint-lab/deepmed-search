# 🚀 Quick Deployment Guide

Deploy DeepMed Search to your server in 5-10 minutes.

> **Use Case**: Quick testing, demo environment, small-scale deployment

[中文](./QUICKSTART.zh-CN.md) | [Full Production Guide](./PRODUCTION.md) | [CI/CD Automation](./CICD.md)

## 📋 Prerequisites

- A Linux server (Ubuntu 20.04+ recommended)
- Docker and Docker Compose
- Minimum 2GB RAM, 4GB+ recommended
- Domain name (optional, for HTTPS)

## 🎯 Deployment Architecture

**Quick deployment using pre-built images:**
- ✅ No compilation required, pull images directly
- ✅ Save server resources (2GB RAM is enough)
- ✅ Fast deployment (5-10 minutes)
- ✅ Uses `docker-compose.demo.yml` configuration

## 📦 Quick Deployment Steps

### 1. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | bash

# Add current user to docker group
sudo usermod -aG docker $USER

# Re-login or run
newgrp docker
```

### 2. Clone Project

```bash
# Clone repository
git clone https://github.com/hint-lab/deepmed-search.git
cd deepmed-search

# Switch to demo branch (uses pre-built images)
git checkout demo-without-gpu
```

### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

**Required Configuration:**

```bash
# Database configuration
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<generate-strong-password>
POSTGRES_DB=deepmed
DATABASE_URL=postgresql://postgres:<password>@postgres:5432/deepmed

# NextAuth configuration
NEXTAUTH_URL=http://your-server-ip:3000  # or https://your-domain.com
NEXTAUTH_SECRET=<run: openssl rand -base64 32>

# Encryption key
ENCRYPTION_KEY=<run: openssl rand -base64 32>

# MinIO configuration (optional but recommended)
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=<generate-strong-password>
MINIO_PUBLIC_URL=http://your-server-ip:3000  # or https://your-domain.com
```

**Generate Keys:**

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY
openssl rand -base64 32

# Generate strong password
openssl rand -base64 16
```

### 4. Start Services

```bash
# Pull latest images
docker compose -f docker-compose.demo.yml pull

# Start all services
docker compose -f docker-compose.demo.yml up -d

# Check service status
docker compose -f docker-compose.demo.yml ps
```

### 5. Initialize Database

```bash
# Run database migrations (first time deployment)
docker compose -f docker-compose.demo.yml exec --user root app sh -c "npx prisma db push --skip-generate --accept-data-loss"
```

### 6. Access Application

🎉 Deployment complete! Visit `http://your-server-ip:3000`

**Default Test Account:**
- Email: `test@example.com`
- Password: `password123`

## 🔍 Verify Deployment

### Check Service Status

```bash
# View all containers
docker compose -f docker-compose.demo.yml ps

# You should see these services running:
# - app (Next.js application)
# - postgres (database)
# - redis (queue system)
# - milvus (vector database)
# - minio (file storage)
# - markitdown (document parser)
# - queue-worker (background tasks)
```

### View Logs

```bash
# View application logs
docker compose -f docker-compose.demo.yml logs -f app

# View worker logs
docker compose -f docker-compose.demo.yml logs -f queue-worker

# View all logs
docker compose -f docker-compose.demo.yml logs --tail=50
```

### Test Features

1. **Login**: Visit `/login` and use test account
2. **Configure API Keys**: Visit `/settings/llm` to configure your LLM API keys
3. **Create Knowledge Base**: Visit `/knowledgebase` to create knowledge base and upload documents
4. **Test Search**: Test various search features on home page

## 🔧 Common Commands

```bash
# Check service status
docker compose -f docker-compose.demo.yml ps

# Restart all services
docker compose -f docker-compose.demo.yml restart

# Restart specific service
docker compose -f docker-compose.demo.yml restart app

# Stop all services
docker compose -f docker-compose.demo.yml stop

# Stop and remove containers (keep data)
docker compose -f docker-compose.demo.yml down

# View logs
docker compose -f docker-compose.demo.yml logs -f [service-name]

# Update services (pull latest images)
docker compose -f docker-compose.demo.yml pull
docker compose -f docker-compose.demo.yml up -d
```

## ⚙️ Service Access

| Service | Address | Description |
|---------|---------|-------------|
| **Application** | `http://server-ip:3000` | Main application interface |
| **PostgreSQL** | `localhost:5432` | Database (internal access) |
| **Redis** | `localhost:6379` | Queue system (internal access) |
| **Milvus** | `localhost:19530` | Vector database (internal access) |
| **MinIO Console** | `http://server-ip:9001` | File storage admin interface |
| **BullMQ Board** | `http://server-ip:8003/admin/queues` | Queue monitoring dashboard |

## 🌐 Configure Domain and HTTPS (Optional)

To configure domain and HTTPS, see:
- [SSL/HTTPS Quick Setup](./SSL_QUICKSTART.en.md)
- [Traefik SSL Detailed Setup](./TRAEFIK_SSL_SETUP.md)

## 🔄 Update Application

```bash
cd /path/to/deepmed-search

# Pull latest code
git pull origin demo-without-gpu

# Pull latest images
docker compose -f docker-compose.demo.yml pull

# Restart services
docker compose -f docker-compose.demo.yml up -d

# Check status
docker compose -f docker-compose.demo.yml ps
```

## ❗ Troubleshooting

### 1. Port Already in Use

```bash
# Check port usage
sudo lsof -i :3000
sudo lsof -i :80
sudo lsof -i :443

# Stop services using the ports
sudo systemctl stop nginx
sudo systemctl stop apache2
```

### 2. Out of Memory

```bash
# Stop unnecessary services
docker compose -f docker-compose.demo.yml stop attu bull-board

# Or clean up unused containers and images
docker system prune -a
```

### 3. Database Connection Failed

Check `DATABASE_URL` in `.env` file:
```bash
# Format should be:
DATABASE_URL=postgresql://postgres:password@postgres:5432/deepmed
```

### 4. Container Startup Failed

```bash
# View detailed logs
docker compose -f docker-compose.demo.yml logs [service-name]

# Recreate containers
docker compose -f docker-compose.demo.yml up -d --force-recreate
```

## 📚 Next Steps

- [Production Deployment](./PRODUCTION.md) - Complete production environment setup
- [CI/CD Automation](./CICD.md) - GitHub Actions automated deployment
- [Branching Strategy](./BRANCHING_STRATEGY.en.md) - Understand development and deployment branches

## 🆘 Get Help

Having issues?

1. Check [Troubleshooting Guide](../troubleshooting/)
2. Read [Full Documentation](../README.en.md)
3. Submit [GitHub Issue](https://github.com/hint-lab/deepmed-search/issues)
4. Email: wang-hao@shu.edu.cn

---

**Happy Deploying!** 🎉

