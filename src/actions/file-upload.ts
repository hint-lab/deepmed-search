'use server';
import { getMinioClient, ensureBucketExists, DEFAULT_BUCKET, DOCUMENT_TYPES } from '@/lib/minio';
import { prisma } from '@/lib/prisma';
import { ServerActionResponse } from '@/types/actions';
import { FileStatus, ProcessingStatus } from '@prisma/client';

/**
 * 文档类型
 * 
 * UPLOAD: 普通上传文档
 * - 用于用户直接上传的文档
 * - 存储在 uploads 文件夹下
 * - 通常用于临时文件或用户个人文档
 * 
 * KB: 知识库文档
 * - 用于知识库系统的文档
 * - 存储在 kb 文件夹下
 * - 通常用于系统知识库、FAQ、帮助文档等
 * - 可能会被索引和检索
 */
export type DocumentType = keyof typeof DOCUMENT_TYPES;

/**
 * 上传单个文件到MinIO的指定存储桶
 * 
 * @param file - 要上传的文件
 * @param documentType - 文档类型，默认为 UPLOAD
 *                     - UPLOAD: 普通上传文档，存储在 uploads 文件夹下
 *                     - KB: 知识库文档，存储在 kb 文件夹下
 * @returns 上传结果
 */
export async function uploadFileAction(
    file: File,
    documentType: DocumentType = 'UPLOAD'
): Promise<ServerActionResponse<any>> {
    try {
        const minio = await getMinioClient();
        const bucketName = DEFAULT_BUCKET;
        const folderName = DOCUMENT_TYPES[documentType];

        // 生成唯一的文件名
        const timestamp = Date.now();
        const uniqueFileName = `${folderName}/${timestamp}-${file.name}`;

        // 检查文件是否已存在
        try {
            await minio.statObject(bucketName, uniqueFileName);
            return {
                success: false,
                error: '文件已存在',
            };
        } catch (err) {
            // 文件不存在，继续上传
        }

        // 确保存储桶存在
        await ensureBucketExists(bucketName);

        // 上传文件到 MinIO
        const buffer = await file.arrayBuffer();
        await minio.putObject(
            bucketName,
            uniqueFileName,
            Buffer.from(buffer),
            file.size,
            {
                'Content-Type': file.type,
            }
        );

        // 创建 UploadFile 记录
        const uploadFile = await prisma.uploadFile.create({
            data: {
                name: file.name,
                location: `${bucketName}/${uniqueFileName}`,
                size: file.size,
                type: file.type,
                source_type: documentType === 'KB' ? 'kb' : 'upload',
                status: FileStatus.UNPROCESSED,
                create_date: new Date(),
                create_time: BigInt(timestamp),
                created_by: 'system',
                parser_config: {},
                processing_status: ProcessingStatus.PENDING,
            }
        });
        return {
            success: true,
            data: {
                id: uploadFile.id,
                name: file.name,
                size: file.size,
                type: file.type,
                bucketName,
                objectName: uniqueFileName,
                documentType,
            },
        };
    } catch (error) {
        console.error('Error in uploadFileAction:', error);
        return {
            success: false,
            error: '文件上传失败',
        };
    }
}

/**
 * 删除上传文件
 * 
 * @param fileId - 要删除的文件ID
 * @returns 删除结果
 */
export async function deleteUploadFileAction(
    fileId: string
): Promise<ServerActionResponse<any>> {
    try {
        // 查找文件记录
        const uploadFile = await prisma.uploadFile.findUnique({
            where: { id: fileId }
        });

        if (!uploadFile) {
            return {
                success: false,
                error: '文件不存在',
            };
        }

        // 从 MinIO 删除文件
        const minio = await getMinioClient();
        const bucketName = DEFAULT_BUCKET;

        try {
            // 从 location 中提取对象名称
            const locationParts = uploadFile.location.split('/');
            const objectName = locationParts.slice(1).join('/');

            await minio.removeObject(bucketName, objectName);
        } catch (err) {
            console.error('从 MinIO 删除文件失败:', err);
            // 继续执行，即使 MinIO 删除失败，我们也应该删除数据库记录
        }

        // 删除数据库记录
        await prisma.uploadFile.delete({
            where: { id: fileId }
        });

        return {
            success: true,
            data: {
                id: fileId,
                name: uploadFile.name,
                deleted: true
            }
        };
    } catch (error) {
        console.error('删除上传文件失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '删除文件失败',
        };
    }
}
