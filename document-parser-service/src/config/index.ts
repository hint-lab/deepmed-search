import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs-extra';

// Load environment variables
dotenv.config();

// Ensure storage directory exists
const storagePath = process.env.STORAGE_PATH || './storage';
fs.ensureDirSync(storagePath);

// Configuration object
const config = {
    // Service configuration
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    // Redis configuration
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD || '',
        db: parseInt(process.env.REDIS_DB || '0', 10)
    },

    // Queue configuration
    queue: {
        prefix: process.env.QUEUE_PREFIX || 'bullmq'
    },

    // Storage configuration
    storage: {
        path: storagePath,
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10) // 10MB
    },

    // Log configuration
    log: {
        level: process.env.LOG_LEVEL || 'info'
    }
};

export default config; 