#!/bin/bash

# Milvus 环境设置脚本
# 用于快速启动和配置 Milvus 向量数据库

set -e

echo "=================================="
echo "Milvus 环境设置"
echo "=================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: Docker 未安装${NC}"
    echo "请先安装 Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}错误: Docker Compose 未安装${NC}"
    echo "请先安装 Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker 环境检查通过${NC}"

# 检查端口是否被占用
check_port() {
    local port=$1
    local service=$2
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${YELLOW}警告: 端口 $port ($service) 已被占用${NC}"
        return 1
    fi
    return 0
}

echo ""
echo "检查端口占用..."
check_port 5432 "PostgreSQL"
check_port 19530 "Milvus"
check_port 6379 "Redis"
check_port 9000 "MinIO"

echo ""
echo -e "${GREEN}启动服务...${NC}"

# 启动 Docker Compose
docker-compose up -d

echo ""
echo "等待服务启动..."
sleep 5

# 检查服务状态
echo ""
echo "服务状态:"
docker-compose ps

# 等待 Milvus 健康检查
echo ""
echo "等待 Milvus 启动（这可能需要 1-2 分钟）..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker exec deepmed-milvus curl -f http://localhost:9091/healthz >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Milvus 已就绪${NC}"
        break
    fi
    attempt=$((attempt + 1))
    echo -n "."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}错误: Milvus 启动超时${NC}"
    echo "请检查日志: docker logs deepmed-milvus"
    exit 1
fi

echo ""
echo -e "${GREEN}✓ 所有服务已启动${NC}"

echo ""
echo "=================================="
echo "服务信息:"
echo "=================================="
echo "PostgreSQL:       localhost:5432"
echo "Milvus:          localhost:19530"
echo "Milvus 健康检查:  localhost:9091"
echo "Redis:           localhost:6379"
echo "MinIO API:       http://localhost:9000"
echo "MinIO 控制台:     http://localhost:9001"
echo ""
echo "MinIO 说明:"
echo "- 用于文件存储和 Milvus 向量数据持久化"
echo "- 使用不同的 bucket 分离数据"
echo ""
echo "下一步:"
echo "1. 安装依赖: yarn install"
echo "2. 初始化数据库: yarn db:init"
echo "3. 启动应用: yarn dev"
echo ""
echo -e "${GREEN}设置完成！${NC}"

