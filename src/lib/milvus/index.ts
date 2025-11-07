export {
    getMilvusClient,
    checkMilvusConnection,
    ensureCollection,
    closeMilvusConnection,
    getCollectionName,
    VECTOR_DIMENSIONS,
} from './client';

export {
    searchSimilarChunks,
    insertVectors,
    updateChunkEmbedding,
    deleteKnowledgeBaseVectors,
    deleteDocumentVectors,
} from './operations';

export type {
    ChunkSearchResult,
    MilvusInsertParams,
    SearchParams,
} from './operations';

