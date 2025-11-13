# MarkItDown Docker 镜像
FROM python:3.11-slim

# 设置工作目录
WORKDIR /app

# 配置国内 APT 镜像源（阿里云）
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
    sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list 2>/dev/null || true && \
    sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
    sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list 2>/dev/null || true

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    # PDF 处理依赖
    poppler-utils \
    # 图像处理依赖
    tesseract-ocr \
    tesseract-ocr-chi-sim \
    tesseract-ocr-eng \
    # 其他依赖
    libmagic1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 配置 pip 国内镜像源（阿里云）
RUN pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/ && \
    pip config set global.trusted-host mirrors.aliyun.com

# 复制 requirements.txt 并安装依赖
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# 创建 API 服务脚本
COPY api_server.py /app/

# 暴露端口
EXPOSE 5000

# 设置环境变量
ENV APP_ENV=production \
    PORT=5000 \
    HOST=0.0.0.0 \
    UVICORN_WORKERS=1 \
    UVICORN_LOG_LEVEL=info

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# 启动服务（使用 uvicorn 作为生产服务器）
CMD ["python", "api_server.py"]

