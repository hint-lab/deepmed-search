export {
    getMilvusClient,
    checkMilvusConnection,
    ensureCollection,
    closeMilvusConnection,
    getCollectionName,
} from './client';

export { VECTOR_DIMENSIONS } from './config';

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

