# BullMQ Board 使用指南

## 概述

BullMQ Board 是 BullMQ 队列的官方监控界面，提供可视化的队列管理、任务监控和性能分析功能。

## 快速开始

### 1. 启动 BullMQ Board

BullMQ Board 已经添加到 `docker-compose.yml` 中，启动服务：

```bash
docker-compose up -d bull-board
```

### 2. 访问 BullMQ Board

打开浏览器访问：**http://localhost:8003/admin/queues**

> **注意**：默认端口是 `8003`，可以通过环境变量 `BULL_BOARD_PORT` 修改

### 3. 查看队列

BullMQ Board 会自动连接到 Redis 并显示所有队列：

- **document-to-markdown** - 文档转换队列
- **chunk-vector-index** - 向量索引队列
- **deep-research** - 深度研究队列

## 主要功能

### 1. 队列概览

**路径**：首页

显示：
- 所有队列列表
- 每个队列的任务统计（等待、活跃、完成、失败）
- 队列健康状态

### 2. 查看队列详情

**操作**：点击队列名称

可以查看：
- **Jobs** - 所有任务列表
  - Waiting（等待中）
  - Active（处理中）
  - Completed（已完成）
  - Failed（失败）
  - Delayed（延迟）
  - Paused（暂停）

### 3. 任务管理

**功能**：
- **查看任务详情** - 点击任务 ID 查看完整信息
  - 任务数据（data）
  - 任务选项（opts）
  - 执行结果（result）
  - 错误信息（failedReason）
  - 进度信息（progress）

- **重试失败任务** - 点击失败任务的 "Retry" 按钮
- **删除任务** - 点击任务的 "Remove" 按钮
- **清理队列** - 批量清理已完成或失败的任务

### 4. 实时监控

BullMQ Board 提供实时更新：
- 任务状态自动刷新
- 队列统计实时更新
- 任务进度实时显示

### 5. 搜索和筛选

**功能**：
- 按任务 ID 搜索
- 按状态筛选（等待、活跃、完成、失败）
- 按时间范围筛选

## 常见操作

### 查看文档处理任务

1. 进入 BullMQ Board
2. 点击 **document-to-markdown** 队列
3. 查看 **Active** 标签查看正在处理的任务
4. 点击任务 ID 查看详细信息：
   - 文档 ID
   - 处理选项（model, maintainFormat 等）
   - 当前进度

### 重试失败的任务

1. 进入队列详情
2. 切换到 **Failed** 标签
3. 找到失败的任务
4. 点击 **Retry** 按钮重新执行

### 清理已完成的任务

1. 进入队列详情
2. 切换到 **Completed** 标签
3. 点击 **Clean** 按钮清理已完成的任务
4. 选择清理范围（全部或指定数量）

### 监控队列性能

1. 查看队列概览页面的统计信息
2. 观察任务处理速度
3. 检查失败率
4. 监控队列积压情况

## 高级功能

### 任务详情分析

点击任务 ID 可以查看：
- **Data** - 任务输入数据
- **Options** - 任务配置（重试次数、延迟等）
- **Result** - 任务执行结果
- **Progress** - 任务进度（如果有）
- **Timeline** - 任务时间线
- **Logs** - 任务日志（如果有）

### 批量操作

- **批量重试** - 选择多个失败任务批量重试
- **批量删除** - 选择多个任务批量删除
- **批量清理** - 清理指定状态的所有任务

### 队列统计

查看队列级别的统计：
- 总任务数
- 平均处理时间
- 成功率
- 失败率
- 吞吐量

## 故障排查

### 无法连接到 Redis

**问题**：BullMQ Board 显示连接错误

**解决方案**：
1. 检查 Redis 服务是否运行：
   ```bash
   docker-compose ps redis
   ```

2. 检查环境变量配置：
   ```bash
   docker-compose exec bull-board env | grep REDIS
   ```

3. 查看 BullMQ Board 日志：
   ```bash
   docker-compose logs bull-board
   ```

### 队列不显示

**问题**：BullMQ Board 中看不到队列

**可能原因**：
1. 队列还未创建
2. Redis 连接配置错误
3. 队列名称不匹配

**解决方案**：
1. 确认队列名称与 `src/lib/bullmq/queue-names.ts` 中的定义一致
2. 检查 Redis 连接配置
3. 查看应用日志确认队列是否创建

### 任务不显示

**问题**：队列存在但任务列表为空

**可能原因**：
1. 任务已处理完成并被清理（`removeOnComplete: true`）
2. 任务还未创建
3. 任务在其他状态（如 delayed）

**解决方案**：
1. 检查不同状态标签（Waiting, Active, Completed, Failed）
2. 确认任务是否已创建
3. 检查队列配置中的清理策略

## 与项目集成

### 查看文档处理进度

1. 在应用中触发文档处理
2. 在 BullMQ Board 中找到对应的任务
3. 查看任务详情和进度
4. 监控处理状态

### 调试失败任务

1. 在 BullMQ Board 中查看失败任务
2. 查看失败原因（failedReason）
3. 查看任务数据（data）确认输入是否正确
4. 重试任务或修复问题后重新提交

### 性能优化

1. 监控队列积压情况
2. 分析任务处理时间
3. 识别瓶颈队列
4. 调整 Worker 并发数或队列配置

## 配置说明

### 环境变量

在 `docker-compose.yml` 中配置：

```yaml
environment:
  REDIS_URL: redis://redis:6379  # Redis 连接 URL
  REDIS_HOST: redis               # Redis 主机（如果使用独立配置）
  REDIS_PORT: 6379                # Redis 端口
  REDIS_PASSWORD:                 # Redis 密码（可选）
  PORT: 3000                       # BullMQ Board 端口
```

### 端口配置

默认端口：`8003`

修改方式：
1. 在 `.env` 文件中设置 `BULL_BOARD_PORT=8080`
2. 或在 `docker-compose.yml` 中直接修改

## 对比其他工具

| 工具 | 用途 | 优势 |
|------|------|------|
| **BullMQ Board** | BullMQ 专用监控 | 功能全面、实时更新、易于使用 |
| **RedisInsight** | Redis 通用管理 | 可以查看底层 Redis 数据 |
| **Redis CLI** | 命令行工具 | 快速查询、适合脚本 |

**推荐使用场景**：
- **日常监控**：使用 BullMQ Board（推荐）
- **深度调试**：使用 RedisInsight 查看底层数据
- **自动化脚本**：使用 Redis CLI

## 参考资源

- [BullMQ Board GitHub](https://github.com/felixmosh/bull-board)
- [BullMQ 官方文档](https://docs.bullmq.io/)
- [BullMQ Board 示例](https://github.com/felixmosh/bull-board/tree/master/examples)

## 注意事项

1. **安全性**：BullMQ Board 是管理界面，建议：
   - 不要在生产环境暴露到公网
   - 使用反向代理添加认证
   - 限制访问 IP

2. **性能影响**：监控界面会查询 Redis，大量操作可能影响性能

3. **数据清理**：注意任务清理策略，避免数据积累过多

4. **版本兼容**：确保 BullMQ Board 版本与 BullMQ 版本兼容

