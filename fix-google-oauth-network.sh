#!/bin/bash

echo "🔍 Google OAuth 网络问题诊断"
echo ""

# 检查是否能访问 Google
echo "测试 Google OAuth 服务连接..."
if curl -s --connect-timeout 5 https://accounts.google.com/.well-known/openid-configuration > /dev/null 2>&1; then
    echo "✅ 可以访问 Google OAuth 服务"
else
    echo "❌ 无法访问 Google OAuth 服务"
    echo ""
    echo "可能的原因："
    echo "  1. 网络被防火墙阻止"
    echo "  2. 在中国大陆（Google 服务被墙）"
    echo "  3. 需要配置代理"
    echo ""
    echo "解决方案："
    echo ""
    echo "方案 1: 配置 HTTP 代理（推荐）"
    echo "  在 .env 文件中添加："
    echo "    HTTP_PROXY=http://your-proxy:port"
    echo "    HTTPS_PROXY=http://your-proxy:port"
    echo ""
    echo "方案 2: 暂时禁用 Google OAuth"
    echo "  运行: bash fix-google-oauth-network.sh disable"
    echo ""
    echo "方案 3: 使用其他登录方式"
    echo "  - 继续使用邮箱密码登录"
    echo "  - 配置 GitHub OAuth（如果可以访问 GitHub）"
fi

if [ "$1" = "disable" ]; then
    echo ""
    echo "🔧 禁用 Google OAuth..."
    sed -i 's/^GOOGLE_CLIENT_ID=/#GOOGLE_CLIENT_ID=/' .env
    sed -i 's/^GOOGLE_CLIENT_SECRET=/#GOOGLE_CLIENT_SECRET=/' .env
    echo "✅ 已禁用 Google OAuth"
    echo "⚠️  请重启开发服务器以使更改生效"
fi
