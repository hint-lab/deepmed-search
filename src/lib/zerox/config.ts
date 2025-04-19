import { ModelProvider } from 'zerox/node-zerox/dist/types';
import path from 'path';
import os from 'os';

export const zeroxConfig = {
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    modelProvider: ModelProvider.OPENAI,
    defaultModel: 'gpt-4o-mini',
    storage: {
        path: process.env.STORAGE_PATH || path.join(os.tmpdir(), 'deepmed-search'),
        temp: path.join(os.tmpdir(), 'deepmed-search', 'temp'),
        processed: path.join(os.tmpdir(), 'deepmed-search', 'processed')
    },
    processing: {
        concurrency: 10,
        maxImageSize: 15,
        imageDensity: 300,
        imageHeight: 2048,
        correctOrientation: true,
        trimEdges: true,
        cleanup: true
    }
}; 