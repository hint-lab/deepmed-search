import NextAuth from 'next-auth';

declare module 'next-auth' {
    interface User {
        id: string;
        email: string;
        name: string | null;
        image: string | null;
    }

    interface Session {
        user: User & {
            id: string;
        };
    }
} 