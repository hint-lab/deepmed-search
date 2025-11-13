#!/usr/bin/env python3
"""
MinerU HTTP API Server（优化版 - 模型常驻内存）
使用 Python API 而非 CLI，避免重复加载模型
参考：https://opendatalab.github.io/MinerU/zh/quick_start/docker_deployment/
"""

import json
import logging
import os
import re
import shutil
import subprocess
import tempfile
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict, List, Optional

import uvicorn  # type: ignore
from fastapi import FastAPI, File, Form, UploadFile, status  # type: ignore
from fastapi.responses import JSONResponse  # type: ignore
from minio import Minio  # type: ignore
from minio.error import S3Error  # type: ignore

# 尝试导入 MinerU Python API
MINERU_API_AVAILABLE = False
try:
    from mineru.cli.client import do_parse
    MINERU_API_AVAILABLE = True
    logger_init = logging.getLogger(__name__)
    logger_init.info("✅ MinerU Python API (do_parse) imported successfully")
except ImportError as e:
    logger_init = logging.getLogger(__name__)
    logger_init.warning(f"⚠️  MinerU Python API not available: {e}, will use CLI mode")

APP_ENV = os.environ.get("APP_ENV", "development").lower()
MAX_FILE_SIZE = 200 * 1024 * 1024  # 200MB
ALLOWED_EXTENSIONS = {"pdf"}

# 配置 logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 全局变量：模型预热状态
MODEL_WARMED_UP = False


# 使用 lifespan 管理启动和关闭事件（替代已弃用的 @app.on_event）
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 启动时执行
    logger.info("=" * 70)
    logger.info("🚀 MinerU API Server Starting...")
    logger.info("=" * 70)
    await warmup_model()
    logger.info("=" * 70)
    logger.info("✅ MinerU API Server Ready")
    logger.info("=" * 70)
    yield
    # 关闭时执行（如果需要清理资源）
    logger.info("🛑 MinerU API Server Shutting Down...")


app = FastAPI(
    title="MinerU API Server (Optimized)",
    description="MinerU HTTP API Server with Python API (model persists in memory)",
    version="optimized-1.0",
    lifespan=lifespan,
)


def _get_minio_client() -> Optional[Minio]:
    """获取 MinIO 客户端"""
    endpoint = os.environ.get("MINIO_ENDPOINT", "minio:9000")
    
    # 确保 endpoint 包含端口号
    if ":" not in endpoint:
        endpoint = f"{endpoint}:9000"
    
    access_key = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
    secret_key = os.environ.get("MINIO_SECRET_KEY", "minioadmin")
    secure = os.environ.get("MINIO_SECURE", "false").lower() == "true"
    
    try:
        logger.info(f"Initializing MinIO client: endpoint={endpoint}, secure={secure}")
        return Minio(
            endpoint,
            access_key=access_key,
            secret_key=secret_key,
            secure=secure,
        )
    except Exception as e:
        logger.error(f"Failed to create MinIO client: {e}")
        return None


def _upload_image_to_minio(
    client: Minio,
    bucket_name: str,
    image_path: str,
    document_id: str,
    image_filename: str
) -> Optional[str]:
    """上传图片到 MinIO 并返回 URL"""
    try:
        # 确保存储桶存在
        if not client.bucket_exists(bucket_name):
            client.make_bucket(bucket_name)
        
        # 构建对象路径：documents/{documentId}/images/{filename}
        object_name = f"documents/{document_id}/images/{image_filename}"
        
        # 检测 content type
        content_type = "image/jpeg"
        ext = Path(image_filename).suffix.lower()
        if ext == ".png":
            content_type = "image/png"
        elif ext == ".gif":
            content_type = "image/gif"
        elif ext == ".bmp":
            content_type = "image/bmp"
        elif ext == ".webp":
            content_type = "image/webp"
        
        # 上传文件
        client.fput_object(
            bucket_name,
            object_name,
            image_path,
            content_type=content_type,
        )
        
        # 返回公网访问 URL（使用 MinIO 公网 URL）
        minio_public_url = os.environ.get("MINIO_PUBLIC_URL", "http://localhost:9000")
        return f"{minio_public_url}/{bucket_name}/{object_name}"
    
    except S3Error as e:
        logger.error(f"MinIO S3 error uploading image {image_filename}: {e}")
        return None
    except Exception as e:
        logger.error(f"Error uploading image {image_filename}: {e}")
        return None


def _process_images_and_update_markdown(
    markdown_content: str,
    output_dir: str,
    document_id: Optional[str]
) -> str:
    """
    扫描 MinerU 输出目录中的图片，上传到 MinIO，并更新 Markdown 中的链接
    
    MinerU 会将 PDF 中的图片提取到 images/ 子目录
    """
    if not document_id:
        logger.info("No document_id provided, skipping image upload")
        return markdown_content
    
    minio_client = _get_minio_client()
    if not minio_client:
        logger.warning("MinIO client not available, skipping image upload")
        return markdown_content
    
    bucket_name = os.environ.get("MINIO_BUCKET_NAME", "deepmed")
    
    # 查找输出目录中的所有图片文件
    image_extensions = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
    image_files: List[Path] = []
    
    output_path = Path(output_dir)
    for ext in image_extensions:
        image_files.extend(output_path.glob(f"**/images/*{ext}"))
    
    logger.info(f"Found {len(image_files)} images in output directory")
    
    # 上传所有图片到 MinIO
    image_url_map: Dict[str, str] = {}
    for image_file in image_files:
        image_filename = image_file.name
        minio_url = _upload_image_to_minio(
            minio_client,
            bucket_name,
            str(image_file),
            document_id,
            image_filename
        )
        
        if minio_url:
            # 记录原始文件名到 MinIO URL 的映射
            image_url_map[image_filename] = minio_url
            # 也记录相对路径的映射（MinerU 生成的链接格式为 images/xxx.jpg）
            image_url_map[f"images/{image_filename}"] = minio_url
            logger.info(f"Uploaded image: {image_filename} -> {minio_url}")
    
    # 更新 Markdown 中的图片链接
    # 匹配 ![alt](path) 格式
    def replace_image_link(match):
        alt_text = match.group(1)
        image_path = match.group(2)
        
        # 尝试从映射中找到对应的 MinIO URL
        if image_path in image_url_map:
            return f"![{alt_text}]({image_url_map[image_path]})"
        
        # 尝试只用文件名匹配
        image_name = os.path.basename(image_path)
        if image_name in image_url_map:
            return f"![{alt_text}]({image_url_map[image_name]})"
        
        # 如果没有找到，保持原样
        return match.group(0)
    
    updated_markdown = re.sub(
        r'!\[([^\]]*)\]\(([^)]+)\)',
        replace_image_link,
        markdown_content
    )
    
    return updated_markdown


def _allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _normalize_boolean(value: Optional[str], fallback: bool = False) -> bool:
    if value is None:
        return fallback
    return value.lower() in {"1", "true", "yes", "on"}


def _error_response(
    *,
    status_code: int,
    message: str,
    processing_time: Optional[int] = None,
) -> JSONResponse:
    payload: Dict[str, object] = {
        "code": "error",
        "message": message,
    }
    if processing_time is not None:
        payload["data"] = {"processingTime": processing_time}

    return JSONResponse(status_code=status_code, content=payload)


async def warmup_model():
    """
    服务启动时预热模型
    通过导入 MinerU 模块来预加载模型到内存
    """
    global MODEL_WARMED_UP
    
    if not MINERU_API_AVAILABLE:
        logger.info("⚠️  Python API not available, skipping model warmup")
        return
    
    try:
        start_time = time.time()
        
        # 创建一个最小的测试 PDF 来预热模型
        # 这样首次请求就不需要等待模型加载
        logger.info("Warming up MinerU models (this may take 10-30 seconds)...")
        logger.info("Models will remain in memory for fast subsequent processing")
        
        # 导入 mineru do_parse 会触发模型预加载
        from mineru.cli.client import do_parse
        
        elapsed = time.time() - start_time
        MODEL_WARMED_UP = True
        
        logger.info(f"✅ Model warmup completed in {elapsed:.2f}s")
        logger.info("📊 Models are now resident in memory")
        logger.info("⚡ Subsequent requests will be much faster!")
        
    except Exception as e:
        logger.error(f"❌ Model warmup failed: {e}")
        logger.warning("Will fall back to CLI mode")


@app.get("/health")
def health_check() -> Dict[str, object]:
    """健康检查端点"""
    return {
        "status": "healthy",
        "service": "mineru-optimized",
        "version": "optimized-1.0",
        "api_mode": "python-api" if MINERU_API_AVAILABLE else "cli",
        "model_persistent": MINERU_API_AVAILABLE,
        "model_warmed_up": MODEL_WARMED_UP,
        "timestamp": time.time(),
        "environment": APP_ENV,
    }


def _process_pdf_with_python_api(pdf_path: str, output_dir: str, lang: Optional[str] = None) -> str:
    """
    使用 MinerU Python API (do_parse) 处理 PDF（模型常驻内存，快速）
    
    使用 mineru.cli.client.do_parse 函数，该函数在首次调用时加载模型，
    后续调用会复用已加载的模型，避免重复加载。
    
    Returns:
        str: Markdown 文件路径
    """
    if not MINERU_API_AVAILABLE:
        raise RuntimeError("MinerU Python API not available")
    
    try:
        logger.info(f"📄 Processing with Python API (persistent model): {pdf_path}")
        start_time = time.time()
        
        # 读取 PDF 字节
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
        
        base_name = os.path.splitext(os.path.basename(pdf_path))[0]
        
        # 使用 do_parse 处理 PDF
        # 参数说明：
        # - output_dir: 输出目录
        # - pdf_file_names: PDF 文件名列表
        # - pdf_bytes_list: PDF 字节内容列表
        # - p_lang_list: 语言列表
        # - backend: 后端模式 ('pipeline' 或 'magic-pdf')
        # - parse_method: 解析方法 ('auto', 'txt', 'ocr')
        from mineru.cli.client import do_parse
        
        logger.info("Calling do_parse with Python API (model will be reused)...")
        # MinerU 支持的语言代码：ch (简体中文), ch_server, ch_lite, chinese_cht (繁体中文), en, korean, japan 等
        # 使用 'ch' 而不是 'zh' 来指定中文
        # 如果调用方没有传递语言参数，默认使用 'ch'（简体中文）
        lang_list = [lang] if lang else ['ch']
        logger.info(f"Using language: {lang_list}")
        
        # 从环境变量读取 backend，默认使用 'pipeline'（推荐/稳定）
        # 支持的值：'pipeline'（推荐）, 'vlm-vllm-engine', 'vlm-transformers' 等
        # 注意：vlm-vllm-engine 在某些情况下可能出现兼容性问题（IndexError: list index out of range）
        backend = os.environ.get('MINERU_BACKEND', 'pipeline')
        logger.info(f"Using backend: {backend}")
        
        try:
            do_parse(
                output_dir=output_dir,
                pdf_file_names=[base_name],
                pdf_bytes_list=[pdf_bytes],
                p_lang_list=lang_list,  # 从调用方传递的语言参数，默认 'ch'
                backend=backend,  # 从环境变量 MINERU_BACKEND 读取，默认 'pipeline'
                parse_method='auto',  # 自动检测
                formula_enable=True,  # 启用公式识别
                table_enable=True,   # 启用表格识别
                f_dump_md=True,      # 输出 Markdown
                f_dump_content_list=True,  # 输出 content_list.json
            )
        except Exception as parse_error:
            # 如果使用 vlm-vllm-engine 失败（通常是 IndexError 或其他兼容性问题），自动降级到 pipeline
            if backend == 'vlm-vllm-engine':
                error_msg = str(parse_error)
                logger.warning(f"❌ vlm-vllm-engine backend failed: {error_msg}")
                logger.info("🔄 Automatically retrying with pipeline backend (fallback)...")
                do_parse(
                    output_dir=output_dir,
                    pdf_file_names=[base_name],
                    pdf_bytes_list=[pdf_bytes],
                    p_lang_list=lang_list,
                    backend='pipeline',  # 降级到稳定的 pipeline
                    parse_method='auto',
                    formula_enable=True,
                    table_enable=True,
                    f_dump_md=True,
                    f_dump_content_list=True,
                )
                logger.info("✅ Fallback to pipeline backend succeeded")
            else:
                # 其他 backend 失败，直接抛出异常
                raise
        
        # do_parse 会在 output_dir 下创建如下结构：
        # output_dir/
        #   {base_name}/
        #     auto/
        #       {base_name}.md
        #       content_list.json
        #       images/
        
        md_path = os.path.join(output_dir, base_name, "auto", f"{base_name}.md")
        
        if not os.path.exists(md_path):
            raise FileNotFoundError(f"Markdown file not found: {md_path}")
        
        # 检查并记录图片提取情况
        images_dir = os.path.join(output_dir, base_name, "auto", "images")
        if os.path.exists(images_dir):
            image_count = len([f for f in os.listdir(images_dir) if f.endswith(('.jpg', '.png', '.jpeg'))])
            logger.info(f"📷 Extracted {image_count} images")
        
        elapsed = time.time() - start_time
        logger.info(f"✅ Python API processing completed in {elapsed:.2f}s (model reused)")
        logger.info(f"💾 Output saved to: {md_path}")
        
        return md_path
        
    except Exception as e:
        logger.error(f"❌ Python API processing failed: {e}")
        logger.exception(e)  # 打印完整堆栈跟踪
        raise


def _process_pdf_with_cli(pdf_path: str, output_dir: str) -> str:
    """
    使用 MinerU CLI 处理 PDF（降级方案）
    
    Returns:
        str: Markdown 文件路径
    """
    logger.info(f"Processing with CLI (fallback): {pdf_path}")
    
    cmd = [
        "mineru",
        "-p", pdf_path,
        "-o", output_dir,
    ]
    
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=int(os.environ.get("MINERU_TIMEOUT_SECONDS", "300")),
        env={
            **os.environ,
            "MINERU_MODEL_SOURCE": os.environ.get("MINERU_MODEL_SOURCE", "local"),
        },
    )
    
    if result.returncode != 0:
        error_msg = result.stderr or result.stdout or "Unknown error"
        logger.error(f"MinerU CLI failed: {error_msg}")
        raise RuntimeError(f"MinerU CLI 处理失败: {error_msg}")
    
    logger.info(f"CLI completed. Output: {result.stdout}")
    
    # 查找生成的 Markdown 文件
    base_name = os.path.splitext(os.path.basename(pdf_path))[0]
    possible_paths = [
        os.path.join(output_dir, base_name, "auto", f"{base_name}.md"),
        os.path.join(output_dir, base_name, f"{base_name}.md"),
        os.path.join(output_dir, "auto", f"{base_name}.md"),
    ]
    
    md_path = next((path for path in possible_paths if os.path.exists(path)), None)
    
    if not md_path:
        # 搜索所有 .md 文件
        md_files = []
        for root, _, files in os.walk(output_dir):
            for item in files:
                if item.endswith(".md"):
                    md_files.append(os.path.join(root, item))
        
        if md_files:
            md_path = md_files[0]
        else:
            raise RuntimeError(f"未找到生成的 Markdown 文件。输出目录: {output_dir}")
    
    return md_path


@app.post("/v4/extract/task")
def create_task(
    file: UploadFile = File(...),
    document_id: Optional[str] = Form(None),
    lang: Optional[str] = Form(None)
) -> JSONResponse:
    """
    创建文档提取任务（优化版 - 优先使用 Python API）
    
    参数:
        - file: PDF 文件
        - document_id: (可选) 文档 ID，用于图片上传到 MinIO
        - lang: (可选) 语言代码，如 'ch' (简体中文), 'en' (英文), 'chinese_cht' (繁体中文) 等
               如果不传递，默认使用 'ch' (简体中文)
    """
    start_time = time.time()
    if file.filename is None or file.filename.strip() == "":
        return _error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            message="未选择文件",
        )

    if not _allowed_file(file.filename):
        return _error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            message="只支持 PDF 文件",
        )

    file_bytes = file.file
    file_bytes.seek(0, os.SEEK_END)
    size = file_bytes.tell()
    file_bytes.seek(0)

    if size > MAX_FILE_SIZE:
        return _error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            message=f"文件大小超过限制（最大 {MAX_FILE_SIZE // (1024 * 1024)}MB）",
        )

    temp_dir = tempfile.mkdtemp()
    backend_used = "unknown"
    try:
        filename = os.path.basename(file.filename)
        pdf_path = os.path.join(temp_dir, filename)
        output_dir = os.path.join(temp_dir, "output")

        with open(pdf_path, "wb") as f:
            f.write(file_bytes.read())

        os.makedirs(output_dir, exist_ok=True)

        logger.info(f"Processing {filename}...")

        # 优先使用 Python API（模型常驻），否则降级到 CLI
        try:
            if MINERU_API_AVAILABLE:
                md_path = _process_pdf_with_python_api(pdf_path, output_dir, lang)
                backend_used = "python-api-persistent"
            else:
                md_path = _process_pdf_with_cli(pdf_path, output_dir)
                backend_used = "cli-fallback"
        except Exception as api_error:
            logger.warning(f"Python API failed, falling back to CLI: {api_error}")
            md_path = _process_pdf_with_cli(pdf_path, output_dir)
            backend_used = "cli-fallback"

        logger.info(f"Found markdown file: {md_path}")

        with open(md_path, "r", encoding="utf-8") as f:
            markdown_content = f.read()

        # 处理图片：上传到 MinIO 并更新链接
        if document_id:
            logger.info(f"Processing images for document_id: {document_id}")
            markdown_content = _process_images_and_update_markdown(
                markdown_content,
                output_dir,
                document_id
            )

        paragraphs = [p.strip() for p in markdown_content.split("\n\n") if p.strip()]
        pages: List[Dict[str, object]] = []
        for idx, paragraph in enumerate(paragraphs, start=1):
            pages.append(
                {
                    "pageNum": idx,
                    "content": paragraph,
                    "tokens": len(paragraph.split()),
                }
            )

        processing_time = int((time.time() - start_time) * 1000)
        task_id = f"task_{int(time.time() * 1000)}"

        logger.info(f"Task completed. Processing time: {processing_time}ms")

        return JSONResponse(
            content={
                "code": "success",
                "message": "Task completed successfully",
                "data": {
                    "taskId": task_id,
                    "status": "completed",
                    "extracted": markdown_content,
                    "pages": pages,
                    "metadata": {
                        "processingTime": processing_time,
                        "fileName": filename,
                        "pageCount": len(pages),
                        "backend": backend_used,
                        "apiMode": "python-api" if MINERU_API_AVAILABLE else "cli",
                        "modelPersistent": MINERU_API_AVAILABLE,
                        "contentLength": len(markdown_content),
                        "document_id": document_id,
                    },
                },
            }
        )

    except subprocess.TimeoutExpired:
        processing_time = int((time.time() - start_time) * 1000)
        return _error_response(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            message="文档处理超时（超过指定时间）",
            processing_time=processing_time,
        )

    except Exception as exc:
        processing_time = int((time.time() - start_time) * 1000)
        error_msg = str(exc)
        logger.error(f"Error: {error_msg}")
        return _error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            message=error_msg,
            processing_time=processing_time,
        )

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@app.get("/formats")
def supported_formats() -> Dict[str, object]:
    """返回支持的文件格式列表"""
    return {
        "formats": ["pdf"],
        "max_file_size": MAX_FILE_SIZE,
        "max_file_size_mb": MAX_FILE_SIZE / (1024 * 1024),
        "backend": "mineru-cli",
        "note": "MinerU 开源版本目前只支持 PDF",
    }


@app.get("/info")
def info() -> Dict[str, object]:
    """返回服务信息"""
    try:
        version_result = subprocess.run(
            ["mineru", "--version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        version = (
            version_result.stdout.strip()
            if version_result.returncode == 0
            else "unknown"
        )
    except Exception:
        version = "unknown"

    return {
        "service": "MinerU Docker (Optimized - Persistent Model)",
        "version": version,
        "backend": "python-api" if MINERU_API_AVAILABLE else "cli",
        "api_mode": "python-api" if MINERU_API_AVAILABLE else "cli",
        "model_persistent": MINERU_API_AVAILABLE,
        "model_warmed_up": MODEL_WARMED_UP,
        "optimization": "Models persist in memory, no reload between requests" if MINERU_API_AVAILABLE else "CLI mode (reloads each time)",
        "performance": "Fast (model reuse)" if MINERU_API_AVAILABLE else "Slower (model reload each time)",
        "supported_formats": ["pdf"],
        "model_source": os.environ.get("MINERU_MODEL_SOURCE", "local"),
        "reference": "https://opendatalab.github.io/MinerU/",
        "environment": APP_ENV,
    }


def _resolve_reload(app_env: str) -> bool:
    default_reload = app_env != "production"
    return _normalize_boolean(os.environ.get("UVICORN_RELOAD"), default_reload)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    workers = int(os.environ.get("UVICORN_WORKERS", "1"))
    reload_enabled = _resolve_reload(APP_ENV)
    log_level = os.environ.get("UVICORN_LOG_LEVEL", "info")

    if reload_enabled:
        workers = 1  # Uvicorn reload 模式仅支持单进程

    logger.info(f"Starting MinerU API Server on port {port}...")
    logger.info(
        "Reference: https://opendatalab.github.io/MinerU/zh/quick_start/docker_deployment/"
    )
    logger.info(f"Model source: {os.environ.get('MINERU_MODEL_SOURCE', 'local')}")
    logger.info(f"Environment: {APP_ENV}")
    logger.info(f"Uvicorn workers: {workers}")
    logger.info(f"Reload enabled: {reload_enabled}")

    uvicorn.run(
        "api_server:app",
        host=host,
        port=port,
        reload=reload_enabled,
        workers=workers,
        log_level=log_level,
    )
