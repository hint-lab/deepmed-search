# Attu (Milvus 管理界面) 使用指南

## 概述

Attu 是 Milvus 向量数据库的官方 Web 管理界面，用于可视化管理集合（Collections）、查看数据、监控性能等。

## 快速开始

### 1. 启动 Attu 服务

Attu 已经在 `docker-compose.yml` 中配置好了，确保 Milvus 服务已启动：

```bash
# 启动所有服务（包括 Milvus 和 Attu）
docker-compose up -d

# 或者单独启动 Milvus 和 Attu
docker-compose up -d milvus attu
```

### 2. 访问 Attu

打开浏览器访问：**http://localhost:8001**

> **注意**：README.md 中提到的端口 `8000` 可能有误，实际配置的端口是 `8001`

### 3. 首次连接 Milvus

首次访问 Attu 时，需要连接 Milvus 实例：

1. **连接地址**：
   - **Address**: `milvus` (如果在 Docker 网络内) 或 `localhost` (如果从宿主机访问)
   - **Port**: `19530` (Milvus gRPC 端口)

2. **认证**（如果 Milvus 启用了认证）：
   - **Username**: 默认不需要
   - **Password**: 默认不需要

3. 点击 **"Connect"** 连接

> **提示**：如果 Attu 容器和 Milvus 容器在同一个 Docker 网络中，Attu 会自动连接到 `milvus:19530`

## 主要功能

### 1. 查看集合（Collections）

**路径**：左侧菜单 → **Collections**

可以查看：
- 所有集合列表
- 集合的详细信息（向量维度、索引类型等）
- 集合中的数据量

**本项目中的集合**：
- 知识库的向量数据存储在 Milvus 集合中
- 集合名称通常以 `kb_` 开头，后跟知识库 ID

### 2. 查看集合数据

**路径**：Collections → 选择集合 → **Data Browser**

功能：
- 查看集合中的所有向量数据
- 查看元数据（metadata）
- 搜索和筛选数据
- 查看向量维度信息

### 3. 搜索向量

**路径**：Collections → 选择集合 → **Search**

功能：
- 输入查询向量进行相似度搜索
- 设置搜索参数（topK、相似度阈值等）
- 查看搜索结果和相似度分数

### 4. 索引管理

**路径**：Collections → 选择集合 → **Indexes**

功能：
- 查看集合的索引信息
- 创建新索引
- 删除索引
- 查看索引构建状态

**常用索引类型**：
- `FLAT` - 精确搜索，适合小规模数据
- `IVF_FLAT` - 倒排索引，适合中等规模数据
- `HNSW` - 图索引，适合大规模数据，查询速度快

### 5. 系统监控

**路径**：左侧菜单 → **System View**

功能：
- 查看 Milvus 系统状态
- 监控资源使用情况（CPU、内存）
- 查看查询性能指标
- 查看节点信息

### 6. 查询日志

**路径**：左侧菜单 → **Query Logs**

功能：
- 查看历史查询记录
- 分析查询性能
- 调试查询问题

## 常见操作

### 查看知识库向量数据

1. 进入 **Collections** 页面
2. 找到以 `kb_` 开头的集合（如 `kb_123456`）
3. 点击集合名称进入详情
4. 切换到 **Data Browser** 标签查看数据

### 搜索测试

1. 进入 **Collections** → 选择集合 → **Search**
2. 输入查询向量（JSON 格式，例如：`[0.1, 0.2, 0.3, ...]`）
3. 设置 **TopK**（返回最相似的 K 个结果）
4. 点击 **Search** 查看结果

### 检查集合健康状态

1. 进入 **Collections** 页面
2. 查看集合列表中的状态指示器
3. 绿色表示健康，红色表示有问题
4. 点击集合查看详细信息

### 查看索引状态

1. 进入集合详情 → **Indexes** 标签
2. 查看索引的构建状态：
   - **Finished** - 索引构建完成
   - **InProgress** - 正在构建
   - **Failed** - 构建失败

## 故障排查

### 无法连接到 Milvus

**问题**：Attu 显示连接失败

**解决方案**：
1. 检查 Milvus 服务是否运行：
   ```bash
   docker-compose ps milvus
   ```

2. 检查 Milvus 健康状态：
   ```bash
   curl http://localhost:9091/healthz
   ```

3. 查看 Milvus 日志：
   ```bash
   docker-compose logs milvus
   ```

4. 检查网络连接：
   - 如果从宿主机访问，使用 `localhost:19530`
   - 如果 Attu 在 Docker 网络内，使用 `milvus:19530`

### 集合不显示

**问题**：在 Attu 中看不到集合

**可能原因**：
1. 集合还未创建（需要先上传文档并处理）
2. Milvus 连接配置错误
3. 权限问题

**解决方案**：
1. 确认已创建知识库并上传文档
2. 检查 Milvus 连接配置
3. 查看应用日志确认向量是否成功写入

### 数据为空

**问题**：集合存在但数据为空

**可能原因**：
1. 文档处理失败
2. 向量生成失败
3. 数据写入失败

**解决方案**：
1. 检查文档处理状态（在应用界面）
2. 查看队列 worker 日志：
   ```bash
   docker-compose logs queue-worker
   ```
3. 检查向量索引任务是否成功

## 高级功能

### 导入/导出数据

Attu 支持导入和导出集合数据：
1. 进入集合详情
2. 使用 **Import** 或 **Export** 功能
3. 支持 JSON 格式

### 性能分析

使用 **System View** 和 **Query Logs** 分析：
- 查询延迟
- 吞吐量
- 资源使用情况

### 索引优化

根据数据规模和查询需求选择合适的索引：
- 小规模（< 10万向量）：使用 `FLAT`
- 中等规模（10万-100万）：使用 `IVF_FLAT`
- 大规模（> 100万）：使用 `HNSW`

## 与项目集成

### 查看知识库向量

1. 在应用中创建知识库并上传文档
2. 文档处理完成后，向量会存储在 Milvus 中
3. 在 Attu 中查找对应的集合（集合名格式：`kb_{knowledgeBaseId}`）
4. 查看向量数据和元数据

### 调试向量搜索

1. 在应用中进行知识库搜索
2. 在 Attu 的 **Query Logs** 中查看对应的查询
3. 分析查询性能和结果

### 监控向量数据库

定期检查：
- 集合数量和数据量
- 索引状态
- 系统资源使用
- 查询性能

## 参考资源

- [Attu 官方文档](https://github.com/zilliztech/attu)
- [Milvus 官方文档](https://milvus.io/docs)
- [Milvus 索引类型说明](https://milvus.io/docs/index.md)

## 注意事项

1. **数据安全**：Attu 是管理界面，注意访问权限控制
2. **性能影响**：大量数据操作可能影响 Milvus 性能
3. **备份**：重要操作前建议备份数据
4. **版本兼容**：确保 Attu 版本与 Milvus 版本兼容

