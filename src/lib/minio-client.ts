"use client"

// 获取文件访问 URL
export function getFileUrl(bucketName: string, objectName: string): string {
    return `http://${process.env.NEXT_PUBLIC_MINIO_ENDPOINT || 'localhost'}:${process.env.NEXT_PUBLIC_MINIO_PORT || '9000'}/${bucketName}/${objectName}`;
} 