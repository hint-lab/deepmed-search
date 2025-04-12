export interface IDialog {
    id: string;
    name: string;
    description?: string;
    userId: string;
    knowledgeBaseId?: string;
    create_date: Date;
    update_date: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IMessage {
    id: string;
    content: string;
    role: string;
    dialogId: string;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IRelatedQuestion {
    id: string;
    question: string;
    dialogId: string;
    createdAt: Date;
    updatedAt: Date;
} 