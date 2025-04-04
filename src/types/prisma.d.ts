import { Prisma } from '@prisma/client';

declare module '@prisma/client' {
    interface User {
        tenant?: Tenant | null;
        dialogs: Dialog[];
        messages: Message[];
    }

    interface Tenant {
        users: User[];
    }

    interface Dialog {
        user: User;
        messages: Message[];
    }

    interface Message {
        dialog: Dialog;
        user: User;
    }

    interface SystemStatus {
        id: string;
        status: string;
        message?: string;
        updatedAt: Date;
    }

    interface SystemToken {
        id: string;
        name: string;
        token: string;
        createdAt: Date;
        lastUsedAt?: Date;
    }
} 