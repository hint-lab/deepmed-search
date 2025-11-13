# 查看 Redis/BullMQ 队列信息

## 概述

本项目使用 BullMQ 作为队列系统，基于 Redis 存储。本文档介绍如何查看队列中的任务信息。

## 方法一：使用 RedisInsight（推荐）

### 1. 启动 RedisInsight

RedisInsight 已经添加到 `docker-compose.yml` 中，启动服务：

```bash
docker-compose up -d redisinsight
```

### 2. 访问 RedisInsight

打开浏览器访问：http://localhost:8002

### 3. 连接 Redis

1. 点击 "Add Redis Database"
2. 选择 "Add Database Manually"
3. 填写连接信息：
   - **Host**: `redis` (如果在 Docker 网络内) 或 `localhost` (如果从宿主机访问)
   - **Port**: `6379`
   - **Database Alias**: `DeepMed Queue` (可选)
   - **Password**: 如果设置了 `REDIS_PASSWORD`，请填写
4. 点击 "Add Redis Database"

### 4. 查看 BullMQ 队列

BullMQ 在 Redis 中使用以下键命名模式：

- `bull:document-to-markdown:*` - 文档转换队列
- `bull:chunk-vector-index:*` - 向量索引队列
- `bull:deep-research:*` - 深度研究队列

**查看队列任务：**

1. 在 RedisInsight 中，点击左侧的 "Browser"
2. 在搜索框中输入 `bull:` 查看所有队列相关的键
3. 主要键类型：
   - `bull:{queue-name}:wait` - 等待处理的任务
   - `bull:{queue-name}:active` - 正在处理的任务
   - `bull:{queue-name}:completed` - 已完成的任务
   - `bull:{queue-name}:failed` - 失败的任务
   - `bull:{queue-name}:delayed` - 延迟执行的任务

**查看具体任务信息：**

1. 点击任意键（如 `bull:document-to-markdown:wait`）
2. 查看任务列表，每个任务包含：
   - `id` - 任务 ID
   - `data` - 任务数据
   - `opts` - 任务选项
   - `timestamp` - 时间戳

## 方法二：使用 Redis CLI

### 1. 连接到 Redis 容器

```bash
docker exec -it deepmed-redis redis-cli
```

如果设置了密码：
```bash
docker exec -it deepmed-redis redis-cli -a YOUR_PASSWORD
```

### 2. 查看所有队列键

```bash
# 查看所有 BullMQ 相关的键
KEYS bull:*

# 查看特定队列的键
KEYS bull:document-to-markdown:*
KEYS bull:chunk-vector-index:*
KEYS bull:deep-research:*
```

### 3. 查看队列统计信息

```bash
# 查看等待中的任务数量
LLEN bull:document-to-markdown:wait

# 查看正在处理的任务数量
LLEN bull:document-to-markdown:active

# 查看已完成的任务数量（需要先查看键名）
ZCARD bull:document-to-markdown:completed

# 查看失败的任务数量
ZCARD bull:document-to-markdown:failed
```

### 4. 查看具体任务内容

```bash
# 查看等待队列的第一个任务
LRANGE bull:document-to-markdown:wait 0 0

# 查看任务详情（需要任务 ID）
GET bull:document-to-markdown:{job-id}

# 查看所有等待的任务
LRANGE bull:document-to-markdown:wait 0 -1
```

## 方法三：使用代码 API

项目提供了 API 来查询队列状态：

### 查询任务状态

```bash
GET /api/queue/job-status?jobId={job-id}
```

### 查看队列健康状态

可以通过系统诊断功能查看队列状态（如果已实现）。

## 队列名称说明

根据 `src/lib/bullmq/queue-names.ts`，项目中有以下队列：

1. **document-to-markdown** - 文档转换为 Markdown
2. **chunk-vector-index** - 文档块向量索引
3. **deep-research** - 深度研究任务

## 常见问题

### Q: 为什么队列里看不到任务？

A: 可能的原因：
1. 任务已经处理完成并被清理（`removeOnComplete: true`）
2. 任务还未创建
3. 任务在延迟队列中（`delayed`）

### Q: 如何查看历史任务？

A: BullMQ 默认会清理已完成的任务（`removeOnComplete: true`）。如果需要保留历史：
1. 修改 `src/lib/bullmq/queue-manager.ts` 中的 `removeOnComplete` 选项
2. 或使用 RedisInsight 查看 Redis 的持久化数据

### Q: 如何监控队列性能？

A: 使用 RedisInsight 的监控功能：
1. 查看键的数量变化
2. 监控内存使用
3. 查看慢查询日志

## 参考

- [BullMQ 文档](https://docs.bullmq.io/)
- [RedisInsight 文档](https://redis.io/docs/ui/insight/)
- [Redis CLI 命令参考](https://redis.io/commands/)

