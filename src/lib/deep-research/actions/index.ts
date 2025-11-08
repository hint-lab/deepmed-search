/**
 * Action Handlers - 研究代理的动作处理器集合
 * 
 * 本模块导出所有可用的 action handlers，每个 handler 负责处理一种特定的代理动作。
 * 
 * 可用动作：
 * - answer: 生成并评估答案
 * - reflect: 分解问题为子问题
 * - search: 在互联网上搜索信息
 * - visit: 访问并提取网页内容
 * - curate: 整理和优化知识库
 * 
 * 每个动作都遵循相同的模式：
 * 1. 验证输入
 * 2. 执行核心逻辑
 * 3. 更新 Agent 状态
 * 4. 记录日志
 * 5. 更新控制标志
 */

export * from './answer';   // 答案生成与评估
export * from './reflect';  // 问题分解与反思
export * from './search';   // 互联网搜索
export * from './visit';    // 网页访问与内容提取
export * from './curate';   // 知识库管理 