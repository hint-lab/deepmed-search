#!/bin/bash
# 重新构建并启动 MinerU 服务

set -e

echo "🔨 Rebuilding and restarting MinerU service..."
echo "=============================================="
echo ""

cd /home/hao/deepmed-search

echo "1️⃣  Stopping current service..."
docker-compose stop mineru
echo ""

echo "2️⃣  Rebuilding image (no cache)..."
docker-compose build --no-cache mineru
echo ""

echo "3️⃣  Starting service..."
docker-compose up -d mineru
echo ""

echo "4️⃣  Waiting for service to be ready..."
sleep 5

# 等待健康检查
MAX_WAIT=60
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo "✅ Service is ready!"
        break
    fi
    echo "   Waiting... (${ELAPSED}s / ${MAX_WAIT}s)"
    sleep 5
    ELAPSED=$((ELAPSED + 5))
done

if [ $ELAPSED -ge $MAX_WAIT ]; then
    echo "❌ Service failed to start within ${MAX_WAIT}s"
    echo ""
    echo "Checking logs:"
    docker-compose logs --tail 50 mineru
    exit 1
fi

echo ""
echo "5️⃣  Checking service status..."
curl -s http://localhost:8000/health | python3 -m json.tool
echo ""

echo ""
echo "================================================"
echo "✅ MinerU service is ready!"
echo ""
echo "Next steps:"
echo "  - Test optimization: ./docker/mineru/test_optimization.sh test.pdf"
echo "  - View logs: docker-compose logs -f mineru"
echo "  - Health check: curl http://localhost:8000/health"

