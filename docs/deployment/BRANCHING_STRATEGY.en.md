# 🌿 Branching Strategy

## 📋 Dual-Branch Architecture

This project uses a **dual-branch deployment strategy** to avoid frequent production deployments.

### Branch Overview

| Branch | Purpose | Deployment Trigger | Config File | Description |
|--------|---------|-------------------|-------------|-------------|
| **main** | Development | Push does NOT deploy | `docker-compose.yml` | Daily development, frequent updates, local user deployment |
| **demo-without-gpu** | Demo Environment | Push triggers deployment | `docker-compose.demo.yml` | Demo/showcase, infrequent updates, uses pre-built images |

## 🔄 Workflow

### Daily Development

```bash
# 1. Develop on main branch (default)
git checkout main

# 2. Develop features
# ... make changes ...

# 3. Commit and push
git add .
git commit -m "feat: new feature"
git push origin main

# 4. Main branch does NOT trigger auto-deployment
# Users can run locally: docker compose up -d
```

### Update Demo Environment (Trigger Auto-Deployment)

```bash
# 1. Confirm main branch development is complete and tested

# 2. Switch to demo branch
git checkout demo-without-gpu

# 3. Merge updates from main
git merge main

# 4. Push to remote (triggers auto-deployment)
git push origin demo-without-gpu

# 5. GitHub Actions automatically deploys to demo server
# Completes automatically in a few minutes
```

## 🎯 Branch Characteristics

### demo-without-gpu Branch

**Purpose**: Demo and showcase environment

**Features**:
- ✅ Auto-deployment on push
- ✅ Uses pre-built images (lightweight)
- ✅ No GPU dependency
- ✅ Fast deployment
- ✅ Suitable for infrequent updates

**Use Cases**:
- Feature demonstration
- Showcase to stakeholders
- Stable demo environment
- Public testing

### main Branch

**Purpose**: Development and local deployment

**Features**:
- ✅ Push does NOT trigger deployment
- ✅ Frequent updates
- ✅ Full feature set
- ✅ Users deploy locally

**Use Cases**:
- Feature development
- Bug fixes
- Quick testing
- Local deployment

## 📊 Deployment Comparison

| Item | main | demo-without-gpu |
|------|------|-----------------|
| Push Frequency | Frequent (multiple times daily) | Low (infrequent updates) |
| Auto-Deploy | ❌ No | ✅ Yes |
| Config File | docker-compose.yml | docker-compose.demo.yml |
| Build Method | Local compilation (user's choice) | Pre-built images (automatic) |
| RAM Requirement | Higher (8GB+) | Lower (2GB+) |
| Deployment | Users deploy locally | Server auto-deploys |
| Purpose | Development/testing | Demo/showcase |

## 🚀 Quick Commands

### Create New Feature

```bash
# Create feature branch from main
git checkout main
git checkout -b feature/new-feature

# After development, merge to main
git checkout main
git merge feature/new-feature
git push origin main

# When ready for demo, merge to demo branch
git checkout demo-without-gpu
git merge main
git push origin demo-without-gpu
```

### Fix Bugs

```bash
# Fix on main branch
git checkout main
git add .
git commit -m "fix: resolve issue"
git push origin main

# After testing, merge to demo
git checkout demo-without-gpu
git merge main
git push origin demo-without-gpu
```

### Hotfix

```bash
# Fix directly on main
git checkout main
git add .
git commit -m "hotfix: critical fix"
git push origin main

# Sync to demo branch
git checkout demo-without-gpu
git merge main
git push origin demo-without-gpu
```

## 🔐 Branch Protection Rules (Recommended)

### demo-without-gpu Branch

- ⚪ No special protection
- ✅ Allow force push (if needed)
- ✅ Allow deletion (use caution)

### main Branch

- ✅ Enable branch protection
- ✅ Require PR review (recommended)
- ✅ Require status checks to pass
- ❌ Prohibit force push
- ❌ Prohibit deletion

## 🌐 Server Branch Management

### Current Configuration

Both branches coexist on the server:

```bash
cd /home/deploy/deepmed-search

# Check current branch
git branch

# Should see:
# * demo-without-gpu
#   main
```

### Switch Branches (Manual)

```bash
# Switch to demo environment
git checkout demo-without-gpu
git pull origin demo-without-gpu
docker compose -f docker-compose.demo.yml up -d

# Switch to main environment
git checkout main
git pull origin main
docker compose up -d
```

**Note**: GitHub Actions automatically switches branches; manual operation usually not needed.

## 📝 Commit Convention (Recommended)

Use semantic commit messages:

```bash
# New feature
git commit -m "feat: add user login functionality"

# Bug fix
git commit -m "fix: resolve file upload issue"

# Documentation
git commit -m "docs: update deployment guide"

# Performance
git commit -m "perf: optimize database queries"

# Refactor
git commit -m "refactor: restructure user module"

# Styling
git commit -m "style: adjust page layout"

# Testing
git commit -m "test: add unit tests"

# Build
git commit -m "chore: update dependencies"
```

## ⚠️ Important Notes

### 1. Avoid Direct Development on main

❌ Not Recommended:
```bash
git checkout main
# directly modify code
git commit -m "fix: something"
git push origin main
```

✅ Recommended:
```bash
git checkout -b feature/fix-something
# modify and test
git commit -m "fix: something"
git push origin feature/fix-something
# create PR to main
```

### 2. Regularly Sync main to demo

```bash
# Keep demo branch updated with main changes
git checkout demo-without-gpu
git merge main
git push origin demo-without-gpu
```

### 3. Resolve Conflicts

```bash
# If conflicts occur during merge
git checkout demo-without-gpu
git merge main

# If conflicts, manually resolve then
git add .
git commit -m "merge: merge main to demo"
git push origin demo-without-gpu
```

## 📚 Related Documentation

- [Quick Deployment](./QUICKSTART.md) - Fast deployment guide
- [Tencent Cloud TCR](./TENCENT_CLOUD_REGISTRY.md) - Container registry setup
- [CI/CD Guide](./CICD.md) - Automated deployment setup

---

**Strategy Established**: 2025-11-15  
**Applicable Environment**: Production + Demo Environment

