export interface ISystemStatus {
    id: string;
    status: string;
    message?: string;
    updatedAt: Date;
}

export interface ISystemToken {
    id: string;
    name: string;
    token: string;
    userId: string;
    createdAt: Date;
    lastUsedAt?: Date;
}

export interface ILangfuseConfig {
    id: string;
    userId: string;
    publicKey: string;
    secretKey: string;
    host: string;
    createdAt: Date;
    updatedAt: Date;
} 