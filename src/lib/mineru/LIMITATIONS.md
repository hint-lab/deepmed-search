# MinerU 使用限制

## 文件访问限制

⚠️ **重要：MinerU 是云端服务，无法访问本地文件**

### 核心问题

1. **MinerU 不支持文件上传**：API 不接受 Base64 编码或 multipart/form-data 上传
2. **只支持 URL 方式**：MinerU 通过 HTTP/HTTPS URL 下载文件进行处理
3. **无法访问 localhost**：当您的应用运行在本地时，文件 URL 类似于：

```
http://localhost:9000/deepmed/kb/document.docx
```

这个 URL 只能在您的本地机器上访问，MinerU 云端服务器无法访问 `localhost`。

### API 限制（来自官方文档）

根据 [MinerU API 文档](https://mineru.net/apiManage/docs)：

- ✅ 支持：通过公网可访问的 URL
- ❌ 不支持：直接文件上传（Base64/multipart）
- 📦 批量处理：最多 200 个 URL
- 📏 文件限制：≤ 200MB，≤ 600 页
- 🌏 网络限制：GitHub、AWS 等国外 URL 可能超时

### 解决方案

#### 方案 1：使用公网可访问的 MinIO（推荐用于生产环境）

将 MinIO 部署到公网可访问的服务器：

```bash
# 在云服务器上部署 MinIO
# 配置域名和 SSL
# 例如：https://files.yourdomain.com
```

然后更新环境变量：

```env
MINIO_ENDPOINT=files.yourdomain.com
MINIO_USE_SSL=true
```

#### 方案 2：使用 ngrok 临时暴露本地服务（开发测试，推荐）

使用 ngrok 将本地 MinIO 暴露到公网：

**步骤：**

1. **安装 ngrok**
   ```bash
   # Linux/macOS
   wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
   tar -xvf ngrok-v3-stable-linux-amd64.tgz
   sudo mv ngrok /usr/local/bin/
   
   # 或访问 https://ngrok.com/download
   ```

2. **启动 ngrok**
   ```bash
   # 暴露本地 9000 端口
   ngrok http 9000
   ```

3. **获取公网 URL**
   
   ngrok 会显示：
   ```
   Forwarding  https://abc123.ngrok.io -> http://localhost:9000
   ```

4. **更新环境变量**
   ```env
   # .env.local
   MINIO_ENDPOINT=abc123.ngrok.io
   MINIO_USE_SSL=true
   ```

5. **重启应用**
   ```bash
   yarn dev
   ```

**优点：**
- ✅ 快速（5分钟内完成）
- ✅ 免费版可用
- ✅ 支持 HTTPS

**缺点：**
- ⚠️ 免费版 URL 每次重启会变化
- ⚠️ 仅适用于开发测试
- ⚠️ 有流量限制

#### 方案 3：切换到本地文档处理方案

如果不需要云端处理，可以使用本地方案：

1. **Tesseract OCR**（开源，本地）
   ```bash
   sudo apt-get install tesseract-ocr
   ```

2. **pdf2md**（Node.js 库）
   ```bash
   npm install pdf2md
   ```

3. **Apache Tika**（Java，本地服务器）

#### 方案 4：禁用文档自动处理

如果暂时不需要文档处理功能：

1. 不设置 `MINERU_API_KEY`
2. 系统会跳过 MinerU 处理，返回友好的错误信息
3. 您仍然可以手动上传已处理的 Markdown 文件

### 检查文件是否可访问

运行此命令测试文件 URL 是否可从外网访问：

```bash
# 从外部服务器测试
curl -I "YOUR_FILE_URL"

# 或使用在线工具
# https://reqbin.com/
```

如果返回 200 OK，说明文件可以被 MinerU 访问。

### 当前配置检查

查看您当前的 MinIO 配置：

```typescript
// src/lib/minio/config.ts
MINIO_ENDPOINT=localhost:9000  // ❌ 本地地址，MinerU 无法访问
MINIO_ENDPOINT=files.mydomain.com  // ✅ 公网地址，MinerU 可以访问
```

### 错误示例

如果看到以下错误，说明文件无法被 MinerU 访问：

```
[MinerU] 创建任务失败
error: 'Failed to create task'
fileUrl: 'http://localhost:9000/...'
```

**解决方法：** 使用上述方案之一，确保文件可以从公网访问。

## 为什么 MinerU 不支持文件上传？

根据 API 设计，MinerU 采用"拉取"模式而非"推送"模式：

### 拉取模式（MinerU）
```
您的服务器 -> 提供文件 URL -> MinerU 下载 -> 处理 -> 返回结果
```

**优点：**
- 支持大文件（不受 HTTP 请求大小限制）
- 异步处理（不需要保持长连接）
- 可以批量处理（一次提交 200 个 URL）

**缺点：**
- 文件必须公网可访问
- 需要额外的文件托管服务

### 推送模式（不支持）
```
您的服务器 -> 上传文件 -> MinerU 接收 -> 处理 -> 返回结果
```

## 推荐方案对比

| 方案 | 适用场景 | 实施难度 | 成本 | 推荐度 |
|------|---------|---------|------|--------|
| ngrok | 开发测试 | ⭐ 极简 | 免费 | ⭐⭐⭐⭐⭐ |
| 公网 MinIO | 生产环境 | ⭐⭐⭐ 中等 | $5-20/月 | ⭐⭐⭐⭐ |
| 云存储中转 | 所有场景 | ⭐⭐ 简单 | $0.01/GB | ⭐⭐⭐ |
| 本地处理 | 隐私要求高 | ⭐⭐⭐⭐ 复杂 | 免费 | ⭐⭐ |

## 快速测试（使用 ngrok）

```bash
# 终端 1：启动 ngrok
ngrok http 9000

# 终端 2：测试文件访问
curl https://YOUR-NGROK-URL.ngrok.io/deepmed/kb/your-file.pdf

# 如果返回文件内容，说明配置成功
```

