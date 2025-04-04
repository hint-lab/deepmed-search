import { RunningStatus } from '@/constants/knowledge';

export interface IDocumentInfo {
  chunk_num: number;
  create_date: string;
  create_time: string;
  created_by: string;
  id: string;
  kb_id: string;
  location: string;
  name: string;
  parser_config: IParserConfig;
  parser_id: string;
  process_begin_at?: string;
  process_duation: number;
  progress: number;
  progress_msg: string;
  run: RunningStatus;
  size: number;
  source_type: string;
  status: 'completed' | 'processing' | 'failed';
  thumbnail: string;
  token_num: number;
  type: string;
  update_date: string;
  update_time: number;
  meta_fields?: Record<string, any>;
  error_message?: string;
  extension: string;
  page_count?: number;
  word_count?: number;
  chunk_count?: number;
}

export interface IParserConfig {
  delimiter?: string;
  html4excel?: boolean;
  layout_recognize?: boolean;
  pages: any[];
  raptor?: Raptor;
  graphrag?: GraphRag;
  chunk_size: number;
  overlap: number;
  [key: string]: any;
}

interface Raptor {
  use_raptor: boolean;
}

interface GraphRag {
  community?: boolean;
  entity_types?: string[];
  method?: string;
  resolution?: boolean;
  use_graphrag?: boolean;
}

export interface IChangeParserConfigRequestBody {
  chunk_size: number;
  overlap: number;
  [key: string]: any;
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