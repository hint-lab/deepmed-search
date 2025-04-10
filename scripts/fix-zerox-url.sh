#!/bin/bash

# 修复 zerox 库中硬编码的 OpenAI API URL
# 用法: bash scripts/fix-zerox-url.sh
#
# 这个脚本会将 zerox 库中硬编码的 API URL 替换为 .env 文件中定义的 OPENAI_BASE_URL

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "\n${GREEN}==== 开始修复 zerox 库中的硬编码 API URL ====${NC}"

# 检查 .env 文件是否存在
if [ ! -f .env ]; then
  echo -e "${YELLOW}警告: .env 文件不存在, 将使用默认的 OpenAI API URL${NC}"
  OPENAI_BASE_URL="https://api.openai.com"
else
  # 从 .env 文件中读取 OPENAI_BASE_URL
  OPENAI_BASE_URL=$(grep -E "^OPENAI_BASE_URL=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
  
  # 如果没有在 .env 文件中找到变量，使用默认值
  if [ -z "$OPENAI_BASE_URL" ]; then
    echo -e "${YELLOW}警告: 在 .env 文件中没有找到 OPENAI_BASE_URL, 将使用默认的 OpenAI API URL${NC}"
    OPENAI_BASE_URL="https://api.openai.com"
  fi
fi

# 移除末尾的 /v1 (如果存在)
if [[ "$OPENAI_BASE_URL" == */v1 ]]; then
  OPENAI_BASE_URL=${OPENAI_BASE_URL%/v1}
fi

echo -e "使用的自定义 API 基础 URL: ${GREEN}${OPENAI_BASE_URL}${NC}"

# 要替换的文件
OPENAI_FILE="node_modules/zerox/node-zerox/dist/models/openAI.js"

# 检查文件是否存在
if [ ! -f "$OPENAI_FILE" ]; then
  echo -e "${RED}错误: 找不到文件 ${OPENAI_FILE}${NC}"
  echo -e "${YELLOW}请确保你已经安装了 zerox 库并且路径正确${NC}"
  exit 1
fi

echo -e "\n检查文件: ${OPENAI_FILE}"

# 备份原始文件
cp "$OPENAI_FILE" "${OPENAI_FILE}.bak"
echo -e "已创建备份: ${OPENAI_FILE}.bak"

# 替换硬编码的 URL
HARDCODED_URLS=("https://api.941chat.com" "https://api.openai.com")
MODIFIED=false
TOTAL_REPLACEMENTS=0

for URL in "${HARDCODED_URLS[@]}"; do
  # 计算替换数量
  COUNT=$(grep -c "$URL" "$OPENAI_FILE")
  
  if [ $COUNT -gt 0 ]; then
    echo -e "将 ${URL} 替换为 ${OPENAI_BASE_URL} (${COUNT} 次)"
    sed -i "s|${URL}|${OPENAI_BASE_URL}|g" "$OPENAI_FILE"
    MODIFIED=true
    TOTAL_REPLACEMENTS=$((TOTAL_REPLACEMENTS + COUNT))
  fi
done

echo -e "\n${GREEN}==== 完成 ====${NC}"

if [ "$MODIFIED" = true ]; then
  echo -e "${GREEN}修复成功! 替换了 ${TOTAL_REPLACEMENTS} 个 URL。${NC}"
  echo -e "zerox 库现在将使用 ${OPENAI_BASE_URL} 作为 API 基础 URL。"
else
  echo -e "${YELLOW}没有进行任何替换，可能是 URL 格式已更改或 zerox 库版本已更新。${NC}"
  echo -e "如需手动检查，请编辑文件: ${OPENAI_FILE}"
  # 恢复备份
  mv "${OPENAI_FILE}.bak" "$OPENAI_FILE"
  echo -e "已恢复原始文件。"
fi

echo -e "\n如果你在运行应用程序时仍然遇到问题，请考虑使用环境变量指定完整的 URL:"
echo -e "  ${YELLOW}OPENAI_BASE_URL=${OPENAI_BASE_URL}/v1${NC}" 