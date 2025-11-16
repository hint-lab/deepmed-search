# 🏭 Production Deployment Guide

Complete production environment deployment configuration, including security hardening, HTTPS, monitoring, and backup.

> **Use Case**: Production environment, official launch, high-availability deployment

[中文](./PRODUCTION.zh-CN.md) | [Quick Deployment](./QUICKSTART.md) | [CI/CD Automation](./CICD.md)

## 📋 Pre-Deployment Checklist

### ✅ Infrastructure Requirements

- [ ] Linux server (Ubuntu 20.04+ recommended)
- [ ] 4GB+ RAM, 8GB+ recommended
- [ ] 50GB+ disk space
- [ ] Public IP address
- [ ] Domain name (required for HTTPS)
- [ ] Docker and Docker Compose installed

### ✅ DNS Configuration

- [ ] Domain A record points to server public IP
- [ ] Verify DNS resolution is working

```bash
# Verify DNS resolution
dig your-domain.com +short

# Should return your server IP
```

### ✅ Firewall Configuration

- [ ] Open port 80 (HTTP)
- [ ] Open port 443 (HTTPS)
- [ ] Open port 22 (SSH, restrict source IPs)
- [ ] Close unnecessary ports

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status

# CentOS/RHEL (firewalld)
sudo firewall-cmd --permanent --add-port=22/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

## 🔐 Security Configuration

### 1. Generate Secure Keys

```bash
# Generate NEXTAUTH_SECRET (for session encryption)
openssl rand -base64 32

# Generate ENCRYPTION_KEY (for API key encryption)
openssl rand -base64 32

# Generate database password
openssl rand -base64 16

# Generate MinIO keys
openssl rand -base64 24
```

### 2. Configure Environment Variables

Create `.env` file:

```bash
cd /path/to/deepmed-search
cp .env.example .env
nano .env
```

**Required Configuration:**

```bash
# ==================== NextAuth Configuration ====================
NEXTAUTH_URL=https://your-domain.com  # ⚠️ Must use HTTPS
NEXTAUTH_SECRET=<generated-key>

# ==================== Encryption Configuration ====================
ENCRYPTION_KEY=<generated-key>

# ==================== Database Configuration ====================
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=deepmed
DATABASE_URL=postgresql://postgres:<password>@postgres:5432/deepmed

# ==================== Redis Configuration ====================
REDIS_URL=redis://redis:6379
# Optional: Set Redis password
# REDIS_PASSWORD=<strong-password>
# REDIS_URL=redis://:password@redis:6379

# ==================== MinIO Configuration ====================
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=<custom-key>
MINIO_SECRET_KEY=<strong-password>
MINIO_PUBLIC_URL=https://your-domain.com
MINIO_BROWSER_REDIRECT_URL=https://your-domain.com

# ==================== Milvus Configuration ====================
MILVUS_HOST=milvus-standalone
MILVUS_PORT=19530

# ==================== Document Parsers ====================
MARKITDOWN_URL=http://markitdown:5000
# MINERU_URL=http://mineru:8000  # If using MinerU
```

### 3. Traefik SSL Configuration

Edit `traefik/traefik.yml`:

```yaml
# Change email address to yours
certificatesResolvers:
  letsencrypt:
    acme:
      email: your-email@example.com  # ⚠️ Change this
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web
```

### 4. Docker Compose Configuration

Ensure app service is correctly configured in `docker-compose.yml`:

```yaml
app:
  # ⚠️ Comment out direct port mapping, access only through Traefik
  # ports:
  #   - "3000:3000"
  expose:
    - "3000"  # ✅ Only expose on internal network
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.app.rule=Host(`your-domain.com`)"
    - "traefik.http.routers.app.entrypoints=websecure"
    - "traefik.http.routers.app.tls.certresolver=letsencrypt"
```

## 🚀 Deployment Steps

### Method 1: Automated Deployment Script (Recommended)

```bash
cd /path/to/deepmed-search

# Run SSL configuration script
./docs/deployment/setup-ssl.sh

# Script will automatically:
# 1. Check DNS configuration
# 2. Check firewall ports
# 3. Configure Traefik
# 4. Start services
# 5. Obtain SSL certificate
```

### Method 2: Manual Deployment

#### 1. Clone Project

```bash
cd /opt
sudo git clone https://github.com/hint-lab/deepmed-search.git
cd deepmed-search

# Use main branch for production
git checkout main
```

#### 2. Configure Environment

```bash
# Copy and edit environment variables
cp .env.example .env
nano .env

# Configure Traefik
nano traefik/traefik.yml

# Create necessary directories
mkdir -p traefik/dynamic
mkdir -p logs
chmod 777 logs
```

#### 3. Start Services

```bash
# Pull images (if using pre-built images)
docker compose pull

# Or build images (if building locally)
# docker compose build

# Start all services
docker compose up -d

# Check status
docker compose ps
```

#### 4. Initialize Database

```bash
# Run database migrations
docker compose exec app npx prisma db push --skip-generate --accept-data-loss

# Or run from host
npx prisma db push
```

#### 5. Create Administrator Account

```bash
# Create default test user
npm run create:user

# Or manually create user (after login at /register page)
```

## 🔍 Verify Deployment

### 1. Check Service Status

```bash
# View all container status
docker compose ps

# All services should show "Up" or "healthy"
```

### 2. Check SSL Certificate

```bash
# Browser access
https://your-domain.com

# Command line check
openssl s_client -connect your-domain.com:443 -servername your-domain.com < /dev/null

# View certificate details
echo | openssl s_client -servername your-domain.com -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates
```

### 3. Check Logs

```bash
# Traefik logs (check SSL certificate acquisition)
docker compose logs traefik | grep -i acme
docker compose logs traefik | grep -i error

# Application logs
docker compose logs -f app

# Database logs
docker compose logs postgres
```

### 4. Feature Testing

- [ ] Access `https://your-domain.com`
- [ ] Confirm HTTPS is working (green lock icon)
- [ ] Test user registration and login
- [ ] Configure API Keys (`/settings/llm`)
- [ ] Create knowledge base and upload documents
- [ ] Test various search features
- [ ] Test Deep Research feature

## 🔐 Security Hardening

### 1. Restrict Admin Interface Access

Recommend restricting admin interfaces to internal access only or add authentication:

```yaml
# In docker-compose.yml
services:
  attu:  # Milvus admin interface
    ports:
      - "127.0.0.1:8001:3000"  # Local access only

  redis-insight:  # Redis admin interface
    ports:
      - "127.0.0.1:8002:8001"  # Local access only

  bull-board:  # Queue monitoring
    ports:
      - "127.0.0.1:8003:3000"  # Local access only
```

### 2. Enable Traefik Dashboard Authentication

```bash
# Generate authentication password
htpasswd -nb admin your_password

# Add to docker-compose.yml
traefik:
  labels:
    - "traefik.http.routers.traefik.middlewares=auth"
    - "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$..."
```

### 3. Configure fail2ban

```bash
# Install fail2ban
sudo apt-get install fail2ban

# Configure SSH protection
sudo nano /etc/fail2ban/jail.local

# Add
[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 5
bantime = 3600

# Restart fail2ban
sudo systemctl restart fail2ban
```

### 4. Regular Security Updates

```bash
# Set up automatic security updates
sudo apt-get install unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

## 💾 Backup Strategy

### 1. Database Backup

```bash
# Create backup script
cat > /opt/backup-postgres.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

docker compose exec -T postgres pg_dump -U postgres deepmed | gzip > $BACKUP_DIR/deepmed_$DATE.sql.gz

# Keep last 30 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
EOF

chmod +x /opt/backup-postgres.sh

# Add to crontab (backup daily at 2 AM)
crontab -e
# Add: 0 2 * * * /opt/backup-postgres.sh
```

### 2. File Backup

```bash
# Backup important volumes
docker run --rm \
  -v deepmed-search_postgres-data:/data \
  -v /opt/backups:/backup \
  alpine tar czf /backup/postgres-data-$(date +%Y%m%d).tar.gz -C /data .

docker run --rm \
  -v deepmed-search_minio-data:/data \
  -v /opt/backups:/backup \
  alpine tar czf /backup/minio-data-$(date +%Y%m%d).tar.gz -C /data .
```

### 3. Configuration Backup

```bash
# Backup configuration
tar czf /opt/backups/config-$(date +%Y%m%d).tar.gz \
  .env \
  docker-compose.yml \
  traefik/
```

## 📊 Monitoring

### 1. Service Health Check

```bash
# Check container status
docker compose ps

# Check container resource usage
docker stats

# Check disk usage
df -h
docker system df
```

### 2. Log Monitoring

```bash
# View all logs in real-time
docker compose logs -f

# View specific service logs
docker compose logs -f app
docker compose logs -f postgres
docker compose logs -f traefik

# View error logs
docker compose logs | grep -i error
docker compose logs | grep -i fatal
```

### 3. Certificate Monitoring

```bash
# Check certificate expiration
echo | openssl s_client -servername your-domain.com \
  -connect your-domain.com:443 2>/dev/null | \
  openssl x509 -noout -dates

# Traefik automatically renews certificates (30 days before expiration)
```

### 4. Performance Monitoring

Recommend installing monitoring tools:
- **Prometheus + Grafana**: Metrics monitoring and visualization
- **Loki**: Log aggregation
- **Uptime Kuma**: Service availability monitoring

## 🔄 Updates and Maintenance

### Update Application

```bash
cd /opt/deepmed-search

# Pull latest code
git pull origin main

# Pull latest images
docker compose pull

# Restart services
docker compose up -d

# Check status
docker compose ps
```

### Clean Up Resources

```bash
# Clean unused images
docker image prune -a

# Clean unused volumes (use with caution!)
docker volume prune

# Check disk usage
docker system df
```

## ❗ Troubleshooting

### Issue 1: SSL Certificate Acquisition Failed

**Possible Causes:**
- DNS not correctly resolved to server
- Firewall port 80 not open
- Domain already has other SSL certificate

**Solutions:**

```bash
# 1. Check DNS
dig your-domain.com +short

# 2. Check ports
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# 3. View Traefik logs
docker compose logs traefik | grep -i acme

# 4. Re-obtain certificate
docker compose restart traefik
```

### Issue 2: Application Inaccessible

**Check Steps:**

```bash
# 1. Check container status
docker compose ps

# 2. Check application logs
docker compose logs app

# 3. Check environment variables
docker compose exec app env | grep NEXTAUTH

# 4. Restart application
docker compose restart app
```

### Issue 3: Database Connection Failed

```bash
# 1. Check database status
docker compose ps postgres

# 2. Test connection
docker compose exec app sh -c "npx prisma db push --help"

# 3. Check DATABASE_URL
cat .env | grep DATABASE_URL

# 4. Restart database
docker compose restart postgres
```

### Issue 4: Out of Memory

```bash
# View memory usage
free -h
docker stats

# Stop unnecessary services
docker compose stop attu bull-board redis-insight

# Or upgrade server configuration
```

## 📚 Related Documentation

- [Quick Deployment Guide](./QUICKSTART.md) - Fast deployment experience
- [CI/CD Automation](./CICD.md) - GitHub Actions automation
- [SSL Configuration Details](./TRAEFIK_SSL_SETUP.md) - Traefik SSL detailed configuration
- [Deployment Checklist](./DEPLOYMENT_CHECKLIST.md) - Complete checklist

## 🆘 Get Help

Having issues?

1. Check [Troubleshooting Guide](../troubleshooting/)
2. Check [Full Documentation](../README.en.md)
3. Submit [GitHub Issue](https://github.com/hint-lab/deepmed-search/issues)
4. Email: wang-hao@shu.edu.cn

---

**Production Deployment Complete!** 🎉

**Security Tips:**
- Regularly update system and Docker images
- Monitor server resource usage
- Regularly backup important data
- Update application to latest version promptly

