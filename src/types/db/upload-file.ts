export interface IUploadFile {
    id: string;
    name: string;
    location: string;
    size: number;
    type: string;
    thumbnail?: string;
    create_date: Date;
    create_time: bigint;
    created_by: string;
    parser_id?: string;
    parser_config: any;
    summary?: string;
    metadata?: any;
    createdAt: Date;
    updatedAt: Date;
}
