# 数据库结构图

## ER 图

```mermaid
erDiagram
    User ||--o{ Dialog : has
    User ||--o{ Message : has
    User ||--o{ SystemToken : has
    User ||--|| LangfuseConfig : has
    User }|--|| Tenant : belongs_to

    Tenant ||--o{ KnowledgeBase : has
    Tenant ||--o{ User : has

    KnowledgeBase ||--o{ Document : contains
    KnowledgeBase ||--o{ Tag : has
    KnowledgeBase ||--o{ Chunk : contains
    KnowledgeBase ||--o{ Dialog : has

    Document ||--o{ Chunk : contains
    Document }o--o{ Tag : has

    Dialog ||--o{ Message : contains
    Dialog ||--o{ RelatedQuestion : has

    User {
        string id PK
        string email UK
        string name
        string image
        string password
        string language
        string tenantId FK
        datetime createdAt
        datetime updatedAt
    }

    Tenant {
        string id PK
        string name
        string embd_id
        string llm_id
        string asr_id
        string parser_ids
        string chat_id
        string speech2text_id
        string tts_id
        datetime createdAt
        datetime updatedAt
    }

    Dialog {
        string id PK
        string name
        string description
        string userId FK
        string knowledgeBaseId FK
        datetime create_date
        datetime update_date
    }

    Message {
        string id PK
        string content
        string role
        string dialogId FK
        string userId FK
        datetime createdAt
        datetime updatedAt
    }

    SystemToken {
        string id PK
        string name
        string token UK
        string userId FK
        datetime createdAt
        datetime lastUsedAt
    }

    LangfuseConfig {
        string id PK
        string userId FK UK
        string publicKey
        string secretKey
        string host
        datetime createdAt
        datetime updatedAt
    }

    KnowledgeBase {
        string id PK
        string name
        string description
        string avatar
        int chunk_num
        datetime create_date
        bigint create_time
        string created_by
        int doc_num
        json parser_config
        string parser_id
        string permission
        float similarity_threshold
        string status
        string tenant_id FK
        int token_num
        datetime update_date
        bigint update_time
        float vector_similarity_weight
        string embd_id
        string nickname
        string language
        int operator_permission
        datetime createdAt
        datetime updatedAt
    }

    Document {
        string id PK
        string name
        string content
        string location
        int size
        string type
        string source_type
        string status
        string thumbnail
        int chunk_num
        int token_num
        int progress
        string progress_msg
        string run
        datetime process_begin_at
        int process_duation
        datetime create_date
        bigint create_time
        datetime update_date
        bigint update_time
        string created_by
        string knowledgeBaseId FK
        string parser_id
        json parser_config
        datetime createdAt
        datetime updatedAt
    }

    Tag {
        string id PK
        string name
        string knowledgeBaseId FK
        datetime createdAt
        datetime updatedAt
    }

    Chunk {
        string id PK
        string chunk_id UK
        string content_with_weight
        int available_int
        string doc_id FK
        string doc_name
        string img_id
        string[] important_kwd
        string[] question_kwd
        string[] tag_kwd
        json positions
        json tag_feas
        string kb_id FK
        datetime createdAt
        datetime updatedAt
    }

    RelatedQuestion {
        string id PK
        string question
        string dialogId FK
        datetime createdAt
        datetime updatedAt
    }
```

## 表关系说明

1. **用户相关**
   - `User` 与 `Tenant` 是多对一关系
   - `User` 与 `Dialog` 是一对多关系
   - `User` 与 `Message` 是一对多关系
   - `User` 与 `SystemToken` 是一对多关系
   - `User` 与 `LangfuseConfig` 是一对一关系

2. **知识库相关**
   - `Tenant` 与 `KnowledgeBase` 是一对多关系
   - `KnowledgeBase` 与 `Document` 是一对多关系
   - `KnowledgeBase` 与 `Tag` 是一对多关系
   - `KnowledgeBase` 与 `Chunk` 是一对多关系
   - `KnowledgeBase` 与 `Dialog` 是一对多关系

3. **文档相关**
   - `Document` 与 `Chunk` 是一对多关系
   - `Document` 与 `Tag` 是多对多关系

4. **对话相关**
   - `Dialog` 与 `Message` 是一对多关系
   - `Dialog` 与 `RelatedQuestion` 是一对多关系

## 主要字段说明

1. **通用字段**
   - `id`: 主键，使用 CUID 生成
   - `createdAt`: 创建时间
   - `updatedAt`: 更新时间

2. **用户相关**
   - `User.email`: 用户邮箱，唯一键
   - `User.language`: 用户语言偏好
   - `User.tenantId`: 租户 ID

3. **知识库相关**
   - `KnowledgeBase.similarity_threshold`: 相似度阈值
   - `KnowledgeBase.vector_similarity_weight`: 向量相似度权重
   - `KnowledgeBase.parser_config`: 解析器配置（JSON）

4. **文档相关**
   - `Document.status`: 文档状态
   - `Document.progress`: 处理进度
   - `Document.parser_config`: 解析器配置（JSON）

5. **知识块相关**
   - `Chunk.positions`: 位置信息（JSON）
   - `Chunk.tag_feas`: 标签特征（JSON）
   - `Chunk.important_kwd`: 重要关键词（数组） 