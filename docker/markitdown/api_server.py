#!/usr/bin/env python3
"""
MarkItDown HTTP API Server
提供简单的 HTTP 接口用于文档转换
"""

from flask import Flask, request, jsonify
from markitdown import MarkItDown
import os
import tempfile
import time
from werkzeug.utils import secure_filename

app = Flask(__name__)
md_converter = MarkItDown()

# 配置
MAX_FILE_SIZE = 200 * 1024 * 1024  # 200MB
ALLOWED_EXTENSIONS = {
    'pdf', 'docx', 'doc', 'pptx', 'ppt', 'xlsx', 'xls',
    'txt', 'html', 'htm', 'json', 'xml', 'csv',
    'jpg', 'jpeg', 'png', 'gif', 'bmp',
    'mp3', 'wav', 'm4a',
    'zip', 'epub'
}

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    return jsonify({
        'status': 'healthy',
        'service': 'markitdown',
        'timestamp': time.time()
    })

@app.route('/convert', methods=['POST'])
def convert_document():
    """
    转换文档为 Markdown
    
    请求方式 1: 上传文件
    POST /convert
    Content-Type: multipart/form-data
    Body: file=<binary>
    
    请求方式 2: 提供 URL
    POST /convert
    Content-Type: application/json
    Body: {"url": "http://example.com/document.pdf"}
    
    响应:
    {
        "success": true,
        "content": "markdown content...",
        "processing_time": 1234,
        "metadata": {...}
    }
    """
    start_time = time.time()
    
    try:
        # 方式 1: 文件上传
        if 'file' in request.files:
            file = request.files['file']
            
            if file.filename == '':
                return jsonify({
                    'success': False,
                    'error': '未选择文件'
                }), 400
            
            if not allowed_file(file.filename):
                return jsonify({
                    'success': False,
                    'error': f'不支持的文件格式。支持的格式: {", ".join(ALLOWED_EXTENSIONS)}'
                }), 400
            
            # 保存到临时文件
            filename = secure_filename(file.filename)
            temp_path = os.path.join(tempfile.gettempdir(), filename)
            file.save(temp_path)
            
            try:
                # 转换文档
                result = md_converter.convert(temp_path)
                processing_time = int((time.time() - start_time) * 1000)
                
                return jsonify({
                    'success': True,
                    'content': result.text_content,
                    'processing_time': processing_time,
                    'metadata': {
                        'filename': filename,
                        'size': os.path.getsize(temp_path)
                    }
                })
            finally:
                # 清理临时文件
                if os.path.exists(temp_path):
                    os.remove(temp_path)
        
        # 方式 2: URL（暂不实现，可以后续添加）
        elif request.is_json:
            data = request.get_json()
            url = data.get('url')
            
            if not url:
                return jsonify({
                    'success': False,
                    'error': '请提供 URL'
                }), 400
            
            # TODO: 实现 URL 下载和转换
            return jsonify({
                'success': False,
                'error': 'URL 转换功能暂未实现'
            }), 501
        
        else:
            return jsonify({
                'success': False,
                'error': '请使用 multipart/form-data 上传文件或 JSON 提供 URL'
            }), 400
            
    except Exception as e:
        processing_time = int((time.time() - start_time) * 1000)
        return jsonify({
            'success': False,
            'error': str(e),
            'processing_time': processing_time
        }), 500

@app.route('/formats', methods=['GET'])
def supported_formats():
    """返回支持的文件格式列表"""
    return jsonify({
        'formats': sorted(list(ALLOWED_EXTENSIONS)),
        'max_file_size': MAX_FILE_SIZE,
        'max_file_size_mb': MAX_FILE_SIZE / (1024 * 1024)
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)

