#!/bin/bash

# Traefik + Let's Encrypt 快速配置脚本

set -e

echo "==================================="
echo "Traefik + Let's Encrypt 配置脚本"
echo "==================================="
echo ""

# 检查是否为 root 或有 sudo 权限
if [ "$EUID" -ne 0 ] && ! sudo -n true 2>/dev/null; then 
    echo "注意: 某些操作可能需要 sudo 权限"
fi

# 检查 Docker 和 Docker Compose
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: 未安装 Docker"
    echo "请先安装 Docker: https://docs.docker.com/engine/install/"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "❌ 错误: 未安装 Docker Compose V2"
    echo "请先安装 Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker 和 Docker Compose 已安装"
echo ""

# 检查域名
DOMAIN="www.deepmedsearch.cloud"
echo "检查域名 DNS 配置: $DOMAIN"
echo ""

# 获取服务器公网 IP
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "无法获取")
echo "服务器公网 IP: $SERVER_IP"

# 检查 DNS 解析
DNS_IP=$(dig +short $DOMAIN 2>/dev/null || nslookup $DOMAIN 2>/dev/null | grep Address | tail -n1 | awk '{print $2}' || echo "无法解析")
echo "域名解析 IP: $DNS_IP"
echo ""

if [ "$SERVER_IP" != "$DNS_IP" ]; then
    echo "⚠️  警告: 域名 DNS 解析的 IP 与服务器公网 IP 不匹配"
    echo "   请确保 $DOMAIN 的 A 记录指向 $SERVER_IP"
    echo ""
    read -p "是否继续? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "✅ DNS 配置正确"
fi

echo ""

# 检查并配置邮箱
echo "配置 Let's Encrypt 通知邮箱"
echo "当前配置的邮箱: admin@deepmedsearch.cloud"
read -p "是否修改邮箱地址? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "请输入您的邮箱地址: " EMAIL
    if [ ! -z "$EMAIL" ]; then
        # 使用 sed 替换邮箱
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/email: admin@deepmedsearch.cloud/email: $EMAIL/" traefik/traefik.yml
        else
            # Linux
            sed -i "s/email: admin@deepmedsearch.cloud/email: $EMAIL/" traefik/traefik.yml
        fi
        echo "✅ 邮箱已更新为: $EMAIL"
    fi
fi

echo ""

# 检查端口占用
echo "检查端口占用情况..."
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 || netstat -tuln 2>/dev/null | grep -q ":$port "; then
        return 0
    else
        return 1
    fi
}

PORTS_OK=true
for port in 80 443; do
    if check_port $port; then
        echo "⚠️  警告: 端口 $port 已被占用"
        PORTS_OK=false
    else
        echo "✅ 端口 $port 可用"
    fi
done

echo ""

if [ "$PORTS_OK" = false ]; then
    echo "⚠️  某些端口已被占用，可能会导致 Traefik 无法启动"
    read -p "是否继续? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 检查防火墙规则
echo "检查防火墙配置..."
if command -v ufw &> /dev/null; then
    UFW_STATUS=$(sudo ufw status 2>/dev/null | grep "Status:" | awk '{print $2}')
    if [ "$UFW_STATUS" = "active" ]; then
        echo "检测到 ufw 防火墙，确保端口 80 和 443 已开放"
        echo "如需开放端口，运行:"
        echo "  sudo ufw allow 80/tcp"
        echo "  sudo ufw allow 443/tcp"
    fi
fi

if command -v firewall-cmd &> /dev/null; then
    if sudo firewall-cmd --state &> /dev/null; then
        echo "检测到 firewalld 防火墙，确保端口 80 和 443 已开放"
        echo "如需开放端口，运行:"
        echo "  sudo firewall-cmd --permanent --add-port=80/tcp"
        echo "  sudo firewall-cmd --permanent --add-port=443/tcp"
        echo "  sudo firewall-cmd --reload"
    fi
fi

echo ""

# 创建必要的目录
echo "创建配置目录..."
mkdir -p traefik/dynamic
mkdir -p traefik/logs
echo "✅ 目录已创建"
echo ""

# 检查 .env 文件
echo "检查环境变量配置..."
if [ -f .env ]; then
    if grep -q "NEXTAUTH_URL=https://www.deepmedsearch.cloud" .env; then
        echo "✅ NEXTAUTH_URL 已正确配置为 HTTPS"
    elif grep -q "NEXTAUTH_URL=" .env; then
        echo "⚠️  警告: 检测到 NEXTAUTH_URL 未设置为 HTTPS"
        echo "   建议在 .env 文件中添加或修改："
        echo "   NEXTAUTH_URL=https://www.deepmedsearch.cloud"
        echo ""
        read -p "是否自动修复? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' 's|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://www.deepmedsearch.cloud|' .env
            else
                sed -i 's|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://www.deepmedsearch.cloud|' .env
            fi
            echo "✅ NEXTAUTH_URL 已更新"
        fi
    else
        echo "⚠️  警告: .env 文件中未找到 NEXTAUTH_URL"
        echo "   建议添加: NEXTAUTH_URL=https://www.deepmedsearch.cloud"
    fi
else
    echo "⚠️  警告: 未找到 .env 文件"
    echo "   请创建 .env 文件并配置必要的环境变量"
    echo "   特别是: NEXTAUTH_URL=https://www.deepmedsearch.cloud"
fi
echo ""

# 启动服务
echo "准备启动服务..."
read -p "是否现在启动 Traefik 和应用? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "启动服务..."
    docker compose up -d
    
    echo ""
    echo "⏳ 等待 Traefik 启动..."
    sleep 10
    
    echo ""
    echo "查看 Traefik 状态:"
    docker compose ps traefik
    
    echo ""
    echo "查看 Traefik 日志:"
    docker compose logs traefik | tail -n 20
    
    echo ""
    echo "==================================="
    echo "✅ 配置完成！"
    echo "==================================="
    echo ""
    echo "访问地址:"
    echo "  主应用: https://$DOMAIN"
    echo "  Traefik 仪表板: https://$DOMAIN/dashboard/"
    echo ""
    echo "注意:"
    echo "  1. Let's Encrypt 证书可能需要几分钟来获取"
    echo "  2. 首次访问如果看到证书错误，请等待 1-2 分钟后刷新"
    echo "  3. 查看实时日志: docker compose logs -f traefik"
    echo ""
    echo "如需启用仪表板认证，请查看 TRAEFIK_SSL_SETUP.md 文档"
    echo ""
else
    echo ""
    echo "配置已完成，但未启动服务"
    echo "如需启动服务，运行: docker compose up -d"
fi

echo ""
echo "详细配置文档: TRAEFIK_SSL_SETUP.md"

