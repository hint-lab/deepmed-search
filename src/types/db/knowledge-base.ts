import { RunningStatus } from '@/constants/knowledge';
import { TreeData } from '../tree';


// 导出数据库类型

// 知识库标签类型
export interface Tag {
  id: string;
  name: string;
  knowledgeBaseId: string;
  createdAt: string;
  updatedAt: string;
}

// 知识库列表项类型
export interface IKnowledgeListItem {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  tags?: Tag[];
}

// 知识库创建参数
export interface ICreateKnowledgeParams {
  name: string;
  description?: string;
}

// 知识库更新参数
export interface IUpdateKnowledgeParams {
  name?: string;
  description?: string;
  tags?: string[];
}

// 知识库搜索参数
export interface ISearchKnowledgeParams {
  keyword?: string;
  tags?: string[];
  page?: number;
  pageSize?: number;
}

// 知识库搜索结果
export interface ISearchKnowledgeResult {
  items: IKnowledgeListItem[];
  total: number;
  page: number;
  pageSize: number;
}

// 知识库基础类型
export interface IKnowledgeBase {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  chunk_num: number;
  create_date: string;
  create_time: number;
  created_by: string;
  doc_num: number;
  parser_config: ParserConfig;
  parser_id: string;
  permission: string;
  similarity_threshold: number;
  status: string;
  tenant_id: string;
  token_num: number;
  update_date: string;
  update_time: number;
  vector_similarity_weight: number;
  embd_id: string;
  nickname?: string;
  operator_permission: number;
  documents?: Document[];
  updatedAt: string;
  createdAt: string;
}

// 知识库标签重命名类型
export interface IRenameTag {
  oldName: string;
  newName: string;
}

// 知识库测试结果类型
export interface ITestingResult {
  chunks: Array<{
    id: string;
    content: string;
    score: number;
    document_id: string;
    document_name: string;
    similarity: number;
  }>;
  documents: Array<{
    id: string;
    name: string;
    content: string;
  }>;
  total: number;
}

// 知识库图谱类型
export interface IKnowledgeGraph {
  nodes: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: string;
  }>;
  graph: Record<string, any>;
  mind_map: Record<string, any>;
}

// 解析器配置类型
export interface ParserConfig {
  from_page?: number;
  to_page?: number;
  auto_keywords?: number;
  auto_questions?: number;
  chunk_token_num?: number;
  delimiter?: string;
  html4excel?: boolean;
  layout_recognize?: boolean;
  raptor?: Raptor;
  tag_kb_ids?: string[];
  topn_tags?: number;
}

// Raptor 配置类型
export interface Raptor {
  use_raptor: boolean;
}

// 知识库文档类型
export interface IDocument {
  chunk_num: number;
  create_date: string;
  create_time: number;
  created_by: string;
  id: string;
  knowledgeBaseId: string;
  location: string;
  name: string;
  parser_id: string;
  process_begin_at?: string;
  process_duation: number;
  progress: number;
  progress_msg: string;
  run: string;
  size: number;
  source_type: string;
  status: string;
  thumbnail?: string;
  token_num: number;
  type: string;
  update_date: string;
  update_time: number;
  parser_config: IDocumentParserConfig;
}

// 知识库文件解析配置类型
export interface IDocumentParserConfig {
  [key: string]: any;
}

// 租户信息类型
export interface ITenantInfo {
  asr_id: string;
  embd_id: string;
  img2txt_id: string;
  llm_id: string;
  name: string;
  parser_ids: string;
  role: string;
  tenant_id: string;
  chat_id: string;
  speech2text_id: string;
  tts_id: string;
}

// 知识块类型
export interface IChunk {
  available_int: number;
  chunk_id: string;
  content_with_weight: string;
  doc_id: string;
  doc_name: string;
  img_id: string;
  important_kwd?: string[];
  question_kwd?: string[];
  tag_kwd?: string[];
  positions: number[][];
  tag_feas?: Record<string, number>;
}

// 测试知识块类型
export interface ITestingChunk {
  chunk_id: string;
  content_ltks: string;
  content_with_weight: string;
  doc_id: string;
  doc_name: string;
  img_id: string;
  image_id: string;
  important_kwd: any[];
  kb_id: string;
  similarity: number;
  term_similarity: number;
  vector: number[];
  vector_similarity: number;
  highlight: string;
  positions: number[][];
  docnm_kwd: string;
}

// 测试文档类型
export interface ITestingDocument {
  count: number;
  doc_id: string;
  doc_name: string;
}

export interface IKnowledge {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  chunk_num: number;
  create_date: string;
  create_time: number;
  created_by: string;
  doc_num: number;
  parser_config: ParserConfig;
  parser_id: string;
  permission: string;
  similarity_threshold: number;
  status: string;
  tenant_id: string;
  token_num: number;
  update_date: string;
  update_time: number;
  vector_similarity_weight: number;
  embd_id: string;
  nickname?: string;
  operator_permission: number;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  name: string;
  content?: string;
  knowledgeBaseId: string;
  createdAt: string;
  updatedAt: string;
}
