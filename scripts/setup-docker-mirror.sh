#!/bin/bash

# Docker 镜像加速配置脚本
# 自动配置 Docker daemon 使用国内镜像源

set -e

echo "🚀 Docker 镜像加速配置脚本"
echo "================================"
echo ""

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then 
    echo "❌ 请使用 sudo 运行此脚本"
    echo "用法: sudo bash scripts/setup-docker-mirror.sh"
    exit 1
fi

# 备份原配置文件
if [ -f /etc/docker/daemon.json ]; then
    echo "📦 备份现有配置..."
    cp /etc/docker/daemon.json /etc/docker/daemon.json.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ 备份完成: /etc/docker/daemon.json.backup.*"
fi

# 创建 Docker 配置目录
mkdir -p /etc/docker

# 写入新配置
echo "⚙️  配置 Docker 镜像源..."
cat > /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://dockerproxy.com",
    "https://mirror.ccs.tencentyun.com",
    "https://registry.docker-cn.com"
  ],
  "dns": ["8.8.8.8", "8.8.4.4"],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  }
}
EOF

echo "✅ 配置文件已更新"

# 重启 Docker 服务
echo ""
echo "🔄 重启 Docker 服务..."
systemctl daemon-reload
systemctl restart docker

# 等待 Docker 启动
sleep 3

# 验证配置
echo ""
echo "✅ 验证配置..."
if docker info | grep -A 5 "Registry Mirrors" > /dev/null 2>&1; then
    echo "✅ 镜像源配置成功！"
    echo ""
    docker info | grep -A 10 "Registry Mirrors"
else
    echo "⚠️  警告：无法验证镜像源配置，请手动检查"
fi

echo ""
echo "================================"
echo "✅ 配置完成！"
echo ""
echo "📝 已配置的镜像源："
echo "  - DaoCloud: https://docker.m.daocloud.io"
echo "  - Docker Proxy: https://dockerproxy.com"
echo "  - 腾讯云: https://mirror.ccs.tencentyun.com"
echo "  - Docker CN: https://registry.docker-cn.com"
echo ""
echo "🧪 测试拉取速度："
echo "  time docker pull python:3.10-slim"
echo ""
echo "📚 详细文档："
echo "  docker/MIRROR_SETUP.md"

