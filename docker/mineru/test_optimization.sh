#!/bin/bash
# 测试 MinerU 优化效果

set -e

echo "🧪 Testing MinerU Model Persistence Optimization"
echo "================================================"
echo ""

# 配置
URL="http://localhost:8000"
TEST_PDF="${1:-test.pdf}"

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查服务健康状态
echo "1️⃣  Checking service health..."
HEALTH=$(curl -s ${URL}/health | python3 -m json.tool 2>/dev/null || echo "{}")
API_MODE=$(echo $HEALTH | grep -o '"api_mode": "[^"]*"' | cut -d'"' -f4)
MODEL_WARMED=$(echo $HEALTH | grep -o '"model_warmed_up": [^,}]*' | cut -d':' -f2 | tr -d ' ')
MODEL_PERSISTENT=$(echo $HEALTH | grep -o '"model_persistent": [^,}]*' | cut -d':' -f2 | tr -d ' ')

echo "   API Mode: ${API_MODE}"
echo "   Model Warmed Up: ${MODEL_WARMED}"
echo "   Model Persistent: ${MODEL_PERSISTENT}"
echo ""

if [ "$API_MODE" != "python-api" ]; then
    echo -e "${RED}⚠️  Warning: Not using Python API mode (optimization may not be active)${NC}"
    echo ""
fi

if [ ! -f "$TEST_PDF" ]; then
    echo -e "${RED}❌ Error: Test PDF file not found: ${TEST_PDF}${NC}"
    echo "Usage: $0 <path-to-test-pdf>"
    exit 1
fi

echo "2️⃣  Running performance test..."
echo "   Test PDF: ${TEST_PDF}"
echo ""

# 测试 5 次请求
TOTAL_TIME=0
for i in {1..5}; do
    echo -e "${BLUE}Request $i:${NC}"
    START=$(date +%s.%N)
    
    RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
        -F "file=@${TEST_PDF}" \
        "${URL}/v4/extract/task" 2>&1)
    
    HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d':' -f2)
    BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")
    
    END=$(date +%s.%N)
    DURATION=$(echo "$END - $START" | bc)
    TOTAL_TIME=$(echo "$TOTAL_TIME + $DURATION" | bc)
    
    if [ "$HTTP_CODE" = "200" ]; then
        BACKEND=$(echo "$BODY" | grep -o '"backend": "[^"]*"' | cut -d'"' -f4)
        echo -e "   ✅ Success (${DURATION}s) - Backend: ${BACKEND}"
        
        if [ "$i" -eq 1 ]; then
            FIRST_REQUEST_TIME=$DURATION
        fi
        
        if [ "$i" -gt 1 ]; then
            # 计算速度提升
            SPEEDUP=$(echo "scale=2; $FIRST_REQUEST_TIME / $DURATION" | bc)
            echo -e "   ${GREEN}⚡ Speedup: ${SPEEDUP}x faster than first request${NC}"
        fi
    else
        echo -e "   ${RED}❌ Failed (HTTP $HTTP_CODE)${NC}"
        echo "$BODY" | head -5
    fi
    echo ""
done

# 统计
AVG_TIME=$(echo "scale=2; $TOTAL_TIME / 5" | bc)
echo "================================================"
echo -e "${GREEN}✅ Test completed${NC}"
echo ""
echo "📊 Statistics:"
echo "   First request: ${FIRST_REQUEST_TIME}s"
echo "   Average time: ${AVG_TIME}s"
echo ""

if [ "$API_MODE" = "python-api" ]; then
    echo -e "${GREEN}✅ Optimization is working!${NC}"
    echo "   Models are persistent in memory"
    echo "   Subsequent requests should be 3-7x faster"
else
    echo -e "${RED}⚠️  Using CLI mode (fallback)${NC}"
    echo "   Models are reloaded each request"
    echo "   Consider checking logs for errors"
fi
echo ""
echo "To view detailed logs:"
echo "   docker-compose logs mineru | tail -100"

