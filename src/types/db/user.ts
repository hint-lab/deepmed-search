export interface IUser {
    id: string;
    email: string;
    name?: string;
    image?: string;
    password: string;
    language: string;
    tenantId?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ITenant {
    id: string;
    name: string;
    embd_id?: string;
    llm_id?: string;
    asr_id?: string;
    parser_ids?: string;
    chat_id?: string;
    speech2text_id?: string;
    tts_id?: string;
    createdAt: Date;
    updatedAt: Date;
} 