import crypto from 'crypto';

/**
 * API Key 加密/解密工具
 * 使用 AES-256-GCM 加密算法
 */

// 确保密钥长度为 32 字节（256 位）
const IV_LENGTH = 16; // AES 块大小

/**
 * 获取加密密钥（确保长度为 32 字节）
 * 延迟检查环境变量，避免构建时报错
 */
function getEncryptionKey(): Buffer {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

    if (!ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY environment variable is not set');
    }

    // 使用 SHA-256 将密钥哈希为固定长度
    return crypto
        .createHash('sha256')
        .update(ENCRYPTION_KEY)
        .digest();
}

/**
 * 加密 API Key
 * @param apiKey 原始 API Key
 * @returns 加密后的字符串（格式：iv:authTag:encryptedData）
 */
export function encryptApiKey(apiKey: string): string {
    if (!apiKey) {
        throw new Error('API Key cannot be empty');
    }

    try {
        // 生成随机 IV
        const iv = crypto.randomBytes(IV_LENGTH);

        // 创建加密器
        const cipher = crypto.createCipheriv(
            'aes-256-gcm',
            getEncryptionKey(),
            iv
        );

        // 加密数据
        let encrypted = cipher.update(apiKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // 获取认证标签
        const authTag = cipher.getAuthTag();

        // 返回格式：iv:authTag:encryptedData（使用十六进制编码）
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
        throw new Error(`Failed to encrypt API Key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * 解密 API Key
 * @param encryptedData 加密的字符串（格式：iv:authTag:encryptedData）
 * @returns 原始 API Key
 */
export function decryptApiKey(encryptedData: string): string {
    if (!encryptedData) {
        throw new Error('Encrypted data cannot be empty');
    }

    try {
        // 分割加密数据
        const parts = encryptedData.split(':');
        if (parts.length !== 3) {
            throw new Error('Invalid encrypted data format');
        }

        const [ivHex, authTagHex, encrypted] = parts;

        // 转换为 Buffer
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');

        // 创建解密器
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            getEncryptionKey(),
            iv
        );

        // 设置认证标签
        decipher.setAuthTag(authTag);

        // 解密数据
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        throw new Error(`Failed to decrypt API Key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * 验证加密密钥是否配置正确
 */
export function validateEncryptionKey(): boolean {
    try {
        const testString = 'test-encryption-key-validation';
        const encrypted = encryptApiKey(testString);
        const decrypted = decryptApiKey(encrypted);
        return testString === decrypted;
    } catch {
        return false;
    }
}

