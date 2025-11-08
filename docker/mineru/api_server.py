#!/usr/bin/env python3
"""
MinerU HTTP API Server（基于官方 mineru CLI）
参考：https://opendatalab.github.io/MinerU/zh/quick_start/docker_deployment/
"""

from flask import Flask, request, jsonify
import os
import tempfile
import time
import shutil
import subprocess
from werkzeug.utils import secure_filename
from pathlib import Path

app = Flask(__name__)

# 配置
MAX_FILE_SIZE = 200 * 1024 * 1024  # 200MB
ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    return jsonify({
        'status': 'healthy',
        'service': 'mineru-docker',
        'version': 'self-hosted',
        'timestamp': time.time()
    })

@app.route('/v4/extract/task', methods=['POST'])
def create_task():
    """
    创建文档提取任务（兼容 MinerU Cloud API）
    使用官方 mineru CLI 命令处理文档
    
    响应格式与 MinerU Cloud API 兼容:
    {
        "code": "success",
        "message": "Task created successfully",
        "data": {
            "taskId": "task_xxx",
            "status": "completed",
            "extracted": "markdown content...",
            "pages": [...]
        }
    }
    """
    start_time = time.time()
    temp_dir = None
    
    try:
        # 检查文件上传
        if 'file' not in request.files:
            return jsonify({
                'code': 'error',
                'message': '请上传文件'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({
                'code': 'error',
                'message': '未选择文件'
            }), 400
        
        if not allowed_file(file.filename):
            return jsonify({
                'code': 'error',
                'message': '只支持 PDF 文件'
            }), 400
        
        # 保存到临时目录
        filename = secure_filename(file.filename)
        temp_dir = tempfile.mkdtemp()
        pdf_path = os.path.join(temp_dir, filename)
        output_dir = os.path.join(temp_dir, 'output')
        
        file.save(pdf_path)
        os.makedirs(output_dir, exist_ok=True)
        
        # 使用官方 mineru CLI 命令处理 PDF
        print(f"Processing {filename} with mineru...")
        
        cmd = [
            'mineru',
            '-p', pdf_path,
            '-o', output_dir,
        ]
        
        # 执行 mineru 命令
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,  # 5分钟超时
            env={**os.environ, 'MINERU_MODEL_SOURCE': 'local'}
        )
        
        if result.returncode != 0:
            error_msg = result.stderr or result.stdout or 'Unknown error'
            print(f"MinerU failed: {error_msg}")
            raise Exception(f'MinerU 处理失败: {error_msg}')
        
        print(f"MinerU completed. Output: {result.stdout}")
        
        # 查找生成的 Markdown 文件
        # MinerU 输出结构: output_dir/filename/auto/filename.md
        base_name = os.path.splitext(filename)[0]
        
        # 尝试多种可能的路径
        possible_paths = [
            os.path.join(output_dir, base_name, 'auto', f'{base_name}.md'),
            os.path.join(output_dir, base_name, f'{base_name}.md'),
            os.path.join(output_dir, 'auto', f'{base_name}.md'),
        ]
        
        md_path = None
        for path in possible_paths:
            if os.path.exists(path):
                md_path = path
                break
        
        # 如果还没找到，搜索所有 .md 文件
        if not md_path:
            md_files = []
            for root, dirs, files in os.walk(output_dir):
                for f in files:
                    if f.endswith('.md'):
                        md_files.append(os.path.join(root, f))
            
            if md_files:
                md_path = md_files[0]
            else:
                raise Exception(f'未找到生成的 Markdown 文件。输出目录: {output_dir}')
        
        print(f"Found markdown file: {md_path}")
        
        # 读取 Markdown 内容
        with open(md_path, 'r', encoding='utf-8') as f:
            markdown_content = f.read()
        
        # 简单分页处理（按段落分割）
        paragraphs = [p.strip() for p in markdown_content.split('\n\n') if p.strip()]
        pages = []
        for i, paragraph in enumerate(paragraphs, start=1):
            pages.append({
                'pageNum': i,
                'content': paragraph,
                'tokens': len(paragraph.split())
            })
        
        processing_time = int((time.time() - start_time) * 1000)
        task_id = f"task_{int(time.time() * 1000)}"
        
        print(f"Task completed. Processing time: {processing_time}ms")
        
        return jsonify({
            'code': 'success',
            'message': 'Task completed successfully',
            'data': {
                'taskId': task_id,
                'status': 'completed',
                'extracted': markdown_content,
                'pages': pages,
                'metadata': {
                    'processingTime': processing_time,
                    'fileName': filename,
                    'pageCount': len(pages),
                    'backend': 'mineru-cli',
                    'contentLength': len(markdown_content)
                }
            }
        })
        
    except subprocess.TimeoutExpired:
        processing_time = int((time.time() - start_time) * 1000)
        return jsonify({
            'code': 'error',
            'message': '文档处理超时（超过5分钟）',
            'data': {
                'processingTime': processing_time
            }
        }), 500
        
    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)
        error_msg = str(e)
        print(f"Error: {error_msg}")
        return jsonify({
            'code': 'error',
            'message': error_msg,
            'data': {
                'processingTime': processing_time
            }
        }), 500
    
    finally:
        # 清理临时文件
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)

@app.route('/formats', methods=['GET'])
def supported_formats():
    """返回支持的文件格式列表"""
    return jsonify({
        'formats': ['pdf'],
        'max_file_size': MAX_FILE_SIZE,
        'max_file_size_mb': MAX_FILE_SIZE / (1024 * 1024),
        'backend': 'mineru-cli',
        'note': 'MinerU 开源版本目前只支持 PDF'
    })

@app.route('/info', methods=['GET'])
def info():
    """返回服务信息"""
    try:
        version_result = subprocess.run(
            ['mineru', '--version'],
            capture_output=True,
            text=True,
            timeout=5
        )
        version = version_result.stdout.strip() if version_result.returncode == 0 else 'unknown'
    except:
        version = 'unknown'
    
    return jsonify({
        'service': 'MinerU Docker (Self-hosted)',
        'version': version,
        'backend': 'mineru-cli',
        'supported_formats': ['pdf'],
        'model_source': os.environ.get('MINERU_MODEL_SOURCE', 'local'),
        'reference': 'https://opendatalab.github.io/MinerU/'
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    print(f'Starting MinerU API Server on port {port}...')
    print('Reference: https://opendatalab.github.io/MinerU/zh/quick_start/docker_deployment/')
    print(f'Model source: {os.environ.get("MINERU_MODEL_SOURCE", "local")}')
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
