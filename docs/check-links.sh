#!/bin/bash

# 文档链接检查脚本
# 检查 docs/ 目录下所有 Markdown 文件中的内部链接是否有效

set -e

echo "=================================="
echo "文档链接检查工具"
echo "=================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 计数器
TOTAL_FILES=0
TOTAL_LINKS=0
BROKEN_LINKS=0
ERRORS=()

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$PROJECT_ROOT/docs"

echo "项目根目录: $PROJECT_ROOT"
echo "文档目录: $DOCS_DIR"
echo ""

# 检查 docs 目录是否存在
if [ ! -d "$DOCS_DIR" ]; then
    echo -e "${RED}错误: 文档目录不存在: $DOCS_DIR${NC}"
    exit 1
fi

# 函数：检查文件是否存在
check_file_exists() {
    local file_path=$1
    if [ -f "$file_path" ]; then
        return 0
    else
        return 1
    fi
}

# 函数：解析相对路径
resolve_relative_path() {
    local base_dir=$1
    local relative_path=$2
    
    # 移除 markdown 链接中的锚点
    relative_path=$(echo "$relative_path" | sed 's/#.*//')
    
    # 如果是空的（只有锚点），跳过
    if [ -z "$relative_path" ]; then
        return 0
    fi
    
    # 如果是绝对 URL，跳过
    if [[ "$relative_path" =~ ^https?:// ]]; then
        return 0
    fi
    
    # 解析相对路径
    local full_path
    if [[ "$relative_path" =~ ^\.\. ]]; then
        # 处理 ../
        full_path="$(cd "$base_dir" && cd "$(dirname "$relative_path")" 2>/dev/null && pwd)/$(basename "$relative_path")"
    elif [[ "$relative_path" =~ ^\. ]]; then
        # 处理 ./
        full_path="$base_dir/${relative_path#./}"
    else
        # 相对路径
        full_path="$base_dir/$relative_path"
    fi
    
    echo "$full_path"
}

# 函数：检查单个文件
check_file() {
    local file=$1
    local file_dir=$(dirname "$file")
    local file_name=$(basename "$file")
    
    echo "检查: $file_name"
    
    # 提取所有 markdown 链接 [text](path)
    local links=$(grep -o '\[.*\]([^)]\+)' "$file" 2>/dev/null | sed 's/.*](\([^)]*\)).*/\1/' || true)
    
    if [ -z "$links" ]; then
        echo "  └─ 没有链接"
        return 0
    fi
    
    local link_count=0
    local broken_count=0
    
    while IFS= read -r link; do
        if [ -z "$link" ]; then
            continue
        fi
        
        link_count=$((link_count + 1))
        TOTAL_LINKS=$((TOTAL_LINKS + 1))
        
        # 跳过外部链接和锚点
        if [[ "$link" =~ ^https?:// ]] || [[ "$link" =~ ^# ]]; then
            continue
        fi
        
        # 解析相对路径
        local target_path=$(resolve_relative_path "$file_dir" "$link")
        
        # 检查文件是否存在
        if ! check_file_exists "$target_path"; then
            echo -e "  ${RED}✗${NC} 断开的链接: $link"
            echo -e "    目标: $target_path"
            BROKEN_LINKS=$((BROKEN_LINKS + 1))
            broken_count=$((broken_count + 1))
            ERRORS+=("$file: $link -> $target_path")
        fi
    done <<< "$links"
    
    if [ $broken_count -eq 0 ]; then
        echo -e "  ${GREEN}✓${NC} $link_count 个链接检查通过"
    else
        echo -e "  ${RED}✗${NC} 发现 $broken_count 个断开的链接"
    fi
    echo ""
}

# 遍历所有 markdown 文件
echo "开始检查文档链接..."
echo ""

while IFS= read -r -d '' file; do
    TOTAL_FILES=$((TOTAL_FILES + 1))
    check_file "$file"
done < <(find "$DOCS_DIR" -name "*.md" -type f -print0)

# 同时检查根目录的 README
if [ -f "$PROJECT_ROOT/README.md" ]; then
    TOTAL_FILES=$((TOTAL_FILES + 1))
    check_file "$PROJECT_ROOT/README.md"
fi

if [ -f "$PROJECT_ROOT/README.zh-CN.md" ]; then
    TOTAL_FILES=$((TOTAL_FILES + 1))
    check_file "$PROJECT_ROOT/README.zh-CN.md"
fi

# 输出总结
echo "=================================="
echo "检查完成"
echo "=================================="
echo ""
echo "统计信息:"
echo "  - 检查文件数: $TOTAL_FILES"
echo "  - 总链接数: $TOTAL_LINKS"
echo "  - 断开链接数: $BROKEN_LINKS"
echo ""

if [ $BROKEN_LINKS -eq 0 ]; then
    echo -e "${GREEN}✓ 所有链接有效！${NC}"
    exit 0
else
    echo -e "${RED}✗ 发现 $BROKEN_LINKS 个断开的链接${NC}"
    echo ""
    echo "断开的链接列表:"
    for error in "${ERRORS[@]}"; do
        echo -e "  ${RED}-${NC} $error"
    done
    echo ""
    echo "请修复上述链接或更新文档。"
    exit 1
fi

