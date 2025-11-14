# SSL Quick Start Guide

## 🚀 Quick Start

Enable HTTPS for your DeepMed Search project in just 3 steps!

### 1️⃣ Verify DNS Configuration

Ensure the A record for `www.deepmedsearch.cloud` points to your server IP.

```bash
# Check DNS resolution
dig www.deepmedsearch.cloud +short
```

### 2️⃣ Run Configuration Script

```bash
# Execute the auto-configuration script
./docs/deployment/setup-ssl.sh
```

The script will automatically:
- ✅ Check DNS configuration
- ✅ Check port availability
- ✅ Configure Let's Encrypt email
- ✅ Start Traefik and application

### 3️⃣ Access Your Application

```
https://www.deepmedsearch.cloud
```

That's it! 🎉

---

## 📋 Manual Configuration (Optional)

If you prefer not to use the auto script, you can configure manually:

### Step 1: Modify Email

Edit `traefik/traefik.yml` file to update the Let's Encrypt notification email:

```yaml
certificatesResolvers:
  letsencrypt:
    acme:
      email: wang-hao@shu.edu.cn  # Change to your email
```

### Step 2: Configure Environment Variables

Edit `.env` file and set NEXTAUTH_URL to HTTPS address:

```bash
NEXTAUTH_URL=https://www.deepmedsearch.cloud
```

### Step 3: Start Services

```bash
# Create configuration directory
mkdir -p traefik/dynamic

# Start all services
docker compose up -d

# View Traefik logs
docker compose logs -f traefik
```

### Step 4: Verify Certificate

Wait 1-2 minutes then access:

```
https://www.deepmedsearch.cloud
```

---

## 🔍 Troubleshooting

### Certificate Acquisition Failed?

1. **Check DNS**:
   ```bash
   dig www.deepmedsearch.cloud +short
   ```
   Ensure it resolves to the correct server IP

2. **Check Ports**:
   ```bash
   # Ensure ports 80 and 443 are not in use
   sudo lsof -i :80
   sudo lsof -i :443
   ```

3. **Check Firewall**:
   ```bash
   # Ubuntu/Debian (ufw)
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   
   # CentOS/RHEL (firewalld)
   sudo firewall-cmd --permanent --add-port=80/tcp
   sudo firewall-cmd --permanent --add-port=443/tcp
   sudo firewall-cmd --reload
   ```

4. **Check Logs**:
   ```bash
   docker compose logs traefik | grep -i error
   docker compose logs traefik | grep -i acme
   ```

### Certificate Shows Insecure?

First certificate acquisition may take 1-2 minutes. Please wait and refresh the page.

---

## 🔐 Enable Dashboard Authentication (Recommended)

### 1. Generate Password

```bash
# Install htpasswd (if not installed)
sudo apt-get install apache2-utils

# Generate password (username: admin)
htpasswd -nb admin your_password
```

### 2. Add to Configuration

Edit `docker-compose.yml`, uncomment and add the generated hash in the `traefik` service `labels`:

```yaml
- "traefik.http.routers.traefik.middlewares=auth"
- "traefik.http.middlewares.auth.basicauth.users=admin:$$apr1$$..."  # Paste the generated password
```

⚠️ **Note**: In docker-compose.yml, `$` must be escaped as `$$`

### 3. Restart Service

```bash
docker compose up -d traefik
```

Now accessing `https://www.deepmedsearch.cloud/dashboard/` requires username and password.

---

## 📚 More Information

For detailed configuration instructions, see: [TRAEFIK_SSL_SETUP.md](./TRAEFIK_SSL_SETUP.md)

---

## 🆘 Need Help?

- Check logs: `docker compose logs traefik`
- View status: `docker compose ps`
- Restart service: `docker compose restart traefik`

---

## 🎯 Configuration Files

- `traefik/traefik.yml` - Traefik main configuration
- `traefik/dynamic/tls.yml` - TLS settings
- `docker-compose.yml` - Service configuration

