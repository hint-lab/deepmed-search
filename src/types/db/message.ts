

export interface IMessage {
    id: string;
    content: string;
    role: string;
    dialogId?: string;
    userId?: string;
    createdAt: Date;
    updatedAt: Date;
}
