import { RunningStatus } from '@/constants/knowledge';

export interface IDocumentInfo {
  id: string;
  name: string;
  content?: string;
  location: string;
  size: number;
  type: string;
  source_type: string;
  status: 'enabled' | 'disabled';
  thumbnail?: string;
  chunk_num: number;
  token_num: number;
  progress: number;
  progress_msg?: string;
  run: 'pending' | 'processing' | 'error';
  process_begin_at?: string;
  process_duation: number;
  create_date: string;
  create_time: number;
  update_date: string;
  update_time: number;
  created_by: string;
  knowledgeBaseId: string;
  parser_id?: string;
  parser_config: any;
  markdown_content?: string;
  summary?: string;
  metadata?: any;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_error?: string;
  tags: any[];
  chunks: any[];
}

export interface IParserConfig {
  [key: string]: any;
}

export interface IChangeParserConfigRequestBody {
  documentId: string;
  parserId: string;
  parserConfig: Record<string, any>;
}

export interface IDocumentMetaRequestBody {
  documentId: string;
  meta: Record<string, any>;
}

export interface IUploadDocumentResponse {
  code: number;
  message: string;
  data?: {
    success_count: number;
    failed_count: number;
    failed_files: string[];
  };
}

export interface IGetDocumentListResponse {
  code: number;
  message: string;
  data: {
    docs: IDocumentInfo[];
    total: number;
  };
}

export interface IBaseResponse {
  code: number;
  message: string;
} 