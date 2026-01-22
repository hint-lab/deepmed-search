#!/bin/bash
# 腾讯云容器镜像服务登录脚本

set -e

REGISTRY="jpccr.ccs.tencentyun.com"

echo "=========================================="
echo "🔐 腾讯云容器镜像服务登录"
echo "=========================================="
echo ""

# 检查是否已经登录
if [ -f ~/.docker/config.json ] && grep -q "$REGISTRY" ~/.docker/config.json 2>/dev/null; then
  echo "✅ 检测到已有登录凭证"
  echo ""
  echo "当前登录信息："
  grep -A 2 "$REGISTRY" ~/.docker/config.json | head -3 || true
  echo ""
  read -p "是否要重新登录？(y/N): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "跳过登录"
    exit 0
  fi
fi

echo "📝 请输入腾讯云容器镜像服务凭证："
echo ""

# 提示获取凭证的方法
echo "💡 如何获取凭证："
echo "   1. 访问: https://console.cloud.tencent.com/tcr"
echo "   2. 进入「访问管理」→「访问凭证」"
echo "   3. 生成临时登录密码或使用长期密码"
echo "   4. 用户名通常是你的腾讯云账号 ID（一串数字）"
echo ""

# 读取用户名
read -p "请输入腾讯云账号 ID: " USERNAME

if [ -z "$USERNAME" ]; then
  echo "❌ 用户名不能为空"
  exit 1
fi

# 读取密码（隐藏输入）
read -sp "请输入 TCR 访问密码: " PASSWORD
echo ""

if [ -z "$PASSWORD" ]; then
  echo "❌ 密码不能为空"
  exit 1
fi

# 执行登录
echo ""
echo "🔐 正在登录..."
if echo "$PASSWORD" | docker login "$REGISTRY" -u "$USERNAME" --password-stdin; then
  echo ""
  echo "✅ 登录成功！"
  echo ""
  echo "现在可以拉取镜像了："
  echo "   docker compose -f docker-compose.demo.yml pull"
else
  echo ""
  echo "❌ 登录失败！"
  echo ""
  echo "请检查："
  echo "  1. 用户名是否正确（通常是腾讯云账号 ID）"
  echo "  2. 密码是否正确（TCR 访问密码，不是腾讯云登录密码）"
  echo "  3. 网络连接是否正常"
  exit 1
fi

