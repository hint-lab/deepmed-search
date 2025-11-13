# MinerU Docker 镜像（基于官方 vLLM 镜像，支持 GPU 加速）
# 参考：https://opendatalab.github.io/MinerU/zh/quick_start/docker_deployment/

# GPU 版本（推荐 - Ampere 架构及以上，Compute Capability >= 8.0）
# 使用国内 DaoCloud 镜像加速
FROM docker.m.daocloud.io/vllm/vllm-openai:v0.10.1.1

# 如果是 Turing 架构及以下（Compute Capability < 8.0），使用:
# FROM docker.m.daocloud.io/vllm/vllm-openai:v0.10.2

# 配置国内 APT 镜像源（阿里云）
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources 2>/dev/null || \
    sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list 2>/dev/null || true

# 安装 libgl（OpenCV 支持）和中文字体
RUN apt-get update && \
    apt-get install -y \
        fonts-noto-core \
        fonts-noto-cjk \
        fontconfig \
        libgl1 \
        curl && \
    fc-cache -fv && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 配置 pip 国内镜像源（阿里云）
RUN python3 -m pip config set global.index-url https://mirrors.aliyun.com/pypi/simple/ && \
    python3 -m pip config set global.trusted-host mirrors.aliyun.com

# 安装最新版 MinerU
RUN python3 -m pip install -U 'mineru[core]' --break-system-packages && \
    python3 -m pip cache purge

# 下载 MinerU 模型（使用 ModelScope 国内源）
RUN /bin/bash -c "mineru-models-download -s modelscope -m all"

# 安装 FastAPI + Uvicorn + MinIO 用于 API 服务
RUN python3 -m pip install fastapi "uvicorn[standard]" python-multipart minio --break-system-packages && \
    python3 -m pip cache purge

# 设置工作目录
WORKDIR /app

# 复制 API 服务脚本
COPY api_server.py /app/

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 设置环境变量并启动服务
ENV MINERU_MODEL_SOURCE=local \
    APP_ENV=production \
    UVICORN_WORKERS=1 \
    PYTHONUNBUFFERED=1
# 使用单 worker 确保模型只加载一次并常驻内存
# 如需并发，建议运行多个容器实例而非多 worker
ENTRYPOINT ["python3", "api_server.py"]
