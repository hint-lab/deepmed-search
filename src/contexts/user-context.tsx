"use client"
import { createContext, useContext, ReactNode } from 'react';
import { useUserInfo } from '@/hooks/use-user-info';

interface UserContextType {
    userInfo: {
        id: string | null;
        name: string | null;
        email: string | null;
        image: string | null;
    } | null;
    clearUserInfo: () => void;
    isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
    const { userInfo, clearUserInfo, isLoading } = useUserInfo();

    return (
        <UserContext.Provider value={{ userInfo, clearUserInfo, isLoading }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
} 