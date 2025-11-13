#!/usr/bin/env python3
"""
MarkItDown HTTP API Server（基于 FastAPI）
提供简单的 HTTP 接口用于文档转换
"""

import logging
import os
import re
import shutil
import tempfile
import time
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import quote

import uvicorn  # type: ignore
from fastapi import FastAPI, File, Form, UploadFile, status  # type: ignore
from fastapi.responses import JSONResponse  # type: ignore
from markitdown import MarkItDown
from minio import Minio  # type: ignore
from minio.error import S3Error  # type: ignore

APP_ENV = os.environ.get("APP_ENV", "production").lower()
MAX_FILE_SIZE = 200 * 1024 * 1024  # 200MB

# 配置 logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {
    "pdf",
    "docx",
    "doc",
    "pptx",
    "ppt",
    "xlsx",
    "xls",
    "txt",
    "html",
    "htm",
    "json",
    "xml",
    "csv",
    "jpg",
    "jpeg",
    "png",
    "gif",
    "bmp",
    "mp3",
    "wav",
    "m4a",
    "zip",
    "epub",
}

app = FastAPI(
    title="MarkItDown API Server",
    description="MarkItDown HTTP API Server for document conversion",
    version="1.0.0",
)

md_converter = MarkItDown()


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


def _extract_and_upload_images(
    markdown_content: str,
    temp_dir: str,
    document_id: Optional[str]
) -> str:
    """
    从 Markdown 中提取图片引用，上传到 MinIO，并更新链接
    
    MarkItDown 可能会生成包含图片引用的 Markdown（例如从 Word 文档中提取的图片）
    图片可能被保存在临时目录中
    """
    if not document_id:
        logger.info("No document_id provided, skipping image upload")
        return markdown_content
    
    minio_client = _get_minio_client()
    if not minio_client:
        logger.warning("MinIO client not available, skipping image upload")
        return markdown_content
    
    bucket_name = os.environ.get("MINIO_BUCKET_NAME", "deepmed")
    
    # 查找临时目录中的所有图片文件
    image_extensions = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
    image_files = []
    
    temp_path = Path(temp_dir)
    for ext in image_extensions:
        image_files.extend(temp_path.glob(f"**/*{ext}"))
    
    logger.info(f"Found {len(image_files)} images in temp directory")
    
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
            # 也记录相对路径的映射（如果有的话）
            rel_path = str(image_file.relative_to(temp_path))
            image_url_map[rel_path] = minio_url
            logger.info(f"Uploaded image: {image_filename} -> {minio_url}")
    
    # 更新 Markdown 中的图片链接
    # 匹配 ![alt](path) 格式
    def replace_image_link(match):
        alt_text = match.group(1)
        image_path = match.group(2)
        
        # 尝试从映射中找到对应的 MinIO URL
        image_name = os.path.basename(image_path)
        if image_name in image_url_map:
            return f"![{alt_text}]({image_url_map[image_name]})"
        elif image_path in image_url_map:
            return f"![{alt_text}]({image_url_map[image_path]})"
        
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


@app.get("/health")
def health_check() -> Dict[str, object]:
    """健康检查端点"""
    return {
        "status": "healthy",
        "service": "markitdown",
        "timestamp": time.time(),
        "environment": APP_ENV,
    }


@app.post("/convert")
def convert_document(
    file: UploadFile = File(...),
    document_id: Optional[str] = Form(None),
    language: Optional[str] = Form(None)
) -> JSONResponse:
    """
    转换文档为 Markdown

    请求方式: 上传文件
    POST /convert
    Content-Type: multipart/form-data
    Body: 
        - file: 文件二进制数据
        - document_id: (可选) 文档 ID，用于图片上传到 MinIO
        - language: (可选) 文档语言代码（ISO 639-1），如 'zh', 'en', 'ja', 'ko', 'fr', 'ar'

    响应:
    {
        "success": true,
        "content": "markdown content...",
        "processing_time": 1234,
        "metadata": {...}
    }
    """
    start_time = time.time()
    temp_dir = None

    try:
        if file.filename is None or file.filename.strip() == "":
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "error": "未选择文件",
                },
            )

        if not _allowed_file(file.filename):
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "error": f'不支持的文件格式。支持的格式: {", ".join(sorted(ALLOWED_EXTENSIONS))}',
                },
            )

        # 读取文件内容
        file_bytes = file.file
        file_bytes.seek(0, os.SEEK_END)
        size = file_bytes.tell()
        file_bytes.seek(0)

        if size > MAX_FILE_SIZE:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "error": f"文件大小超过限制（最大 {MAX_FILE_SIZE // (1024 * 1024)}MB）",
                },
            )

        # 创建临时目录用于保存文件和可能提取的图片
        temp_dir = tempfile.mkdtemp()
        filename = file.filename
        temp_path = os.path.join(temp_dir, filename)
        
        with open(temp_path, "wb") as f:
            f.write(file_bytes.read())

        try:
            # 转换文档
            result = md_converter.convert(temp_path)
            markdown_content = result.text_content
            
            # 处理图片：上传到 MinIO 并更新链接
            if document_id:
                logger.info(f"Processing images for document_id: {document_id}")
                markdown_content = _extract_and_upload_images(
                    markdown_content,
                    temp_dir,
                    document_id
                )
            
            processing_time = int((time.time() - start_time) * 1000)

            return JSONResponse(
                content={
                    "success": True,
                    "content": markdown_content,
                    "processing_time": processing_time,
                    "metadata": {
                        "filename": filename,
                        "size": os.path.getsize(temp_path),
                        "document_id": document_id,
                        "language": language,  # 记录语言参数（即使 MarkItDown 库可能不使用）
                    },
                }
            )
        finally:
            # 清理临时目录
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)

    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)
        
        # 清理临时目录
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": str(e),
                "processing_time": processing_time,
            },
        )


@app.get("/formats")
def supported_formats() -> Dict[str, object]:
    """返回支持的文件格式列表"""
    return {
        "formats": sorted(list(ALLOWED_EXTENSIONS)),
        "max_file_size": MAX_FILE_SIZE,
        "max_file_size_mb": MAX_FILE_SIZE / (1024 * 1024),
    }


def _resolve_reload(app_env: str) -> bool:
    """根据环境变量决定是否启用 reload"""
    default_reload = app_env != "production"
    reload_env = os.environ.get("UVICORN_RELOAD", "").lower()
    if reload_env:
        return reload_env in {"1", "true", "yes", "on"}
    return default_reload


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "0.0.0.0")
    workers = int(os.environ.get("UVICORN_WORKERS", "1"))
    reload_enabled = _resolve_reload(APP_ENV)
    log_level = os.environ.get("UVICORN_LOG_LEVEL", "info")

    if reload_enabled:
        workers = 1  # Uvicorn reload 模式仅支持单进程

    logger.info(f"Starting MarkItDown API Server on port {port}...")
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
