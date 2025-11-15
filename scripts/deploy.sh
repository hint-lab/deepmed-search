#!/bin/bash

# DeepMed Search 部署脚本
# 用于服务器端自动部署

set -e

echo "=========================================="
echo "🚀 DeepMed Search 自动部署"
echo "=========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
PROJECT_DIR="${PROJECT_DIR:-/home/deploy/deepmed-search}"
BRANCH="${BRANCH:-main}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/backups}"
LOG_FILE="${LOG_FILE:-$PROJECT_DIR/deploy.log}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"  # 支持指定配置文件

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# 检查是否为 root 或有 sudo 权限
check_permissions() {
    if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then 
        error "需要 root 权限或 sudo 权限"
        exit 1
    fi
}

# 备份数据库
backup_database() {
    log "📦 备份数据库..."
    
    mkdir -p "$BACKUP_DIR"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
    
    # 使用 docker exec 备份 PostgreSQL
    docker compose exec -T postgres pg_dump -U postgres deepmed > "$BACKUP_FILE" 2>/dev/null || {
        warn "数据库备份失败，继续部署"
        return 0
    }
    
    # 压缩备份
    gzip "$BACKUP_FILE"
    log "✅ 数据库备份完成: $BACKUP_FILE.gz"
    
    # 清理旧备份（保留最近7天）
    find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -mtime +7 -delete
}

# 检查服务健康状态
check_health() {
    log "🔍 检查服务健康状态..."
    
    # 等待服务启动
    sleep 15
    
    # 检查关键服务
    SERVICES=("postgres" "redis" "milvus" "app" "queue-worker")
    ALL_HEALTHY=true
    
    for service in "${SERVICES[@]}"; do
        if docker compose ps | grep -q "$service.*Up"; then
            echo -e "${GREEN}✓${NC} $service 运行正常"
        else
            echo -e "${RED}✗${NC} $service 状态异常"
            ALL_HEALTHY=false
        fi
    done
    
    if [ "$ALL_HEALTHY" = false ]; then
        error "部分服务启动失败"
        return 1
    fi
    
    log "✅ 所有服务健康"
    return 0
}

# 回滚到上一个版本
rollback() {
    error "部署失败，开始回滚..."
    
    # 回到上一个 commit
    git reset --hard HEAD^
    
    # 重启服务
    docker compose -f "$COMPOSE_FILE" down
    docker compose -f "$COMPOSE_FILE" up -d
    
    error "已回滚到上一个版本"
    exit 1
}

# 主部署流程
main() {
    cd "$PROJECT_DIR" || exit 1
    
    log "当前目录: $(pwd)"
    log "部署分支: $BRANCH"
    log "配置文件: $COMPOSE_FILE"
    
    # 1. 检查权限
    check_permissions
    
    # 2. 备份数据库
    backup_database
    
    # 3. 拉取最新代码
    log "📥 拉取最新代码..."
    
    # 记录当前 commit（用于回滚）
    CURRENT_COMMIT=$(git rev-parse HEAD)
    log "当前 commit: $CURRENT_COMMIT"
    
    git fetch origin
    git checkout "$BRANCH"
    
    # 检查是否有更新
    LOCAL=$(git rev-parse @)
    REMOTE=$(git rev-parse @{u})
    
    if [ "$LOCAL" = "$REMOTE" ]; then
        log "📌 代码已是最新，无需部署"
        exit 0
    fi
    
    git pull origin "$BRANCH" || {
        error "拉取代码失败"
        exit 1
    }
    
    NEW_COMMIT=$(git rev-parse HEAD)
    log "新 commit: $NEW_COMMIT"
    
    # 4. 停止服务
    log "🛑 停止现有服务..."
    docker compose -f "$COMPOSE_FILE" down || {
        error "停止服务失败"
        exit 1
    }
    
    # 5. 构建新镜像
    log "🔨 构建新镜像..."
    docker compose -f "$COMPOSE_FILE" build --no-cache || {
        error "构建失败"
        rollback
    }
    
    # 6. 启动服务
    log "🚀 启动服务..."
    docker compose -f "$COMPOSE_FILE" up -d || {
        error "启动服务失败"
        rollback
    }
    
    # 7. 检查健康状态
    if ! check_health; then
        rollback
    fi
    
    # 8. 清理
    log "🧹 清理未使用的镜像..."
    docker image prune -f
    
    # 9. 显示状态
    log "📊 服务状态:"
    docker compose -f "$COMPOSE_FILE" ps
    
    log "✅ 部署成功！"
    log "从 $CURRENT_COMMIT 更新到 $NEW_COMMIT"
    
    # 发送通知（可选）
    # send_notification "✅ DeepMed Search 部署成功！"
}

# 捕获错误并回滚
trap 'error "脚本执行出错，第 $LINENO 行"; rollback' ERR

# 执行主流程
main "$@"

