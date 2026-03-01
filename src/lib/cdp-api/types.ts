/**
 * CDP API 类型定义
 * 对应 CDP 后端 FastAPI 的 Pydantic 模型
 */

/**
 * 旧版 API 请求基础格式（/api/retrieve, /api/debate）
 * 保留用于当前页面消费的“统一结构”映射。
 */
export interface CDPBaseRequest {
  case_report: string;      // 病例报告，最小长度5
  patient_id?: string;       // 患者ID，可选，默认"demo_patient"
  top_k?: number;            // 返回结果数量，默认5
}

/**
 * 新版检索接口请求（POST /retrieve/context）
 */
export interface RetrieveContextRequest {
  query: string;
  top_k_pseudo: number;
  top_k_hybrid: number;
  use_graph_retrieval: boolean;
  top_k_graph: number;
  top_k_reranked: number;
  num_pseudo_questions: number;
}

/**
 * 新版检索接口原始响应（POST /retrieve/context）
 */
export interface RetrieveContextItem {
  document: string;
  file: string;
  score: number;
}

export interface RetrieveContextStatsGroup {
  count: number;
  score_range: [number, number];
  avg_score: number;
}

export interface RetrieveContextInterferenceValidation {
  applied: boolean;
  filtered_count: number;
}

export interface RetrieveContextResponse {
  query: string;
  method: string;
  results: {
    reranked: {
      count: number;
      results: RetrieveContextItem[];
      stats: {
        hybrid: RetrieveContextStatsGroup;
        causal: RetrieveContextStatsGroup;
        final: RetrieveContextStatsGroup;
        interference_validation: RetrieveContextInterferenceValidation;
      };
    };
  };
  timing: {
    hybrid_seconds: number;
    graph_seconds: number;
    reasoning_seconds: number;
  };
  has_reasoning: boolean;
}

/**
 * 新版辩论校验接口请求（POST /debate/validate）
 */
export interface DebateValidateRequest {
  query: string;
  paths: string[];
  judgment_mode: "llm" | "heuristic";
}

/**
 * 新版辩论校验接口原始响应（POST /debate/validate）
 */
export interface DebateValidateRound {
  proponent: string;
  opponent: string;
}

export interface DebateValidateDebate {
  rounds: DebateValidateRound[];
  total_rounds: number;
  proponent_confidence: number;
  opponent_confidence: number;
}

export interface DebateValidateLLMJudgment {
  confidence: number;
  reasoning: string;
  accepted: boolean;
}

export interface DebateValidateJudgment {
  accepted: boolean;
  heuristic_margin: number | null;
  proponent_confidence: number | null;
  opponent_confidence: number | null;
  llm_judgment: DebateValidateLLMJudgment | null;
}

export interface DebateValidateResultItem {
  path: string;
  path_index: number;
  debate: DebateValidateDebate;
  judgment: DebateValidateJudgment;
}

export interface DebateValidateResponse {
  debate_result: {
    validated_paths: string[];
    debate_results: DebateValidateResultItem[];
    judgment_results: Array<{
      path: string;
      judgment: DebateValidateJudgment;
    }>;
    stats: {
      debate: {
        total_debated: number;
        successful_debates: number;
        failed_debates: number;
      };
      judgment: {
        total_evaluated: number;
        accepted: number;
        rejected: number;
      };
    };
  };
  // 当前接口实际返回“字符串包裹的 json 代码块”。
  final_answer: string;
}

/**
 * 证据项
 */
export interface EvidenceItem {
  id: string;
  text: string;
  score: number;
  source: string;
  is_generic_noise: boolean;  // 是否置灰（通用噪声）
  is_rare_cue: boolean;       // 是否高亮（罕见线索）
}

/**
 * 图谱节点
 */
export interface GraphNode {
  id: string;
  label: string;
}

/**
 * 图谱边
 */
export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

/**
 * 图谱数据
 */
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * 前端统一检索响应（供页面组件消费）
 * 由 client.ts 将 RetrieveContextResponse 映射到此结构。
 */
export interface RetrievalResponse {
  pseudo_questions: string[];
  evidence_panel: EvidenceItem[];
  graph_data: GraphData;
  mode: "real" | "mock" | "deepmed";
  step_time: number;
}

/**
 * 辩论历史项
 */
export interface DebateHistoryItem {
  proponent: string;
  opponent: string;
}

/**
 * 辩论日志
 */
export interface DebateLog {
  path_id?: number;
  history: DebateHistoryItem[];
  final_confidence: number;
}

/**
 * 前端统一辩论响应（供页面组件消费）
 * 由 client.ts 将 DebateValidateResponse 映射到此结构。
 */
export interface DebateResponse {
  debate_logs: DebateLog[];
  diagnosis: string;
  confidence: number;
  reasoning_trace: string[];
  mode: "real" | "mock" | "deepmed";
  step_time: number;
}

/**
 * API 调用选项
 */
export interface CDPApiOptions {
  patientId?: string;
  topK?: number;
  timeout?: number;  // 超时时间（毫秒），默认30000
}
