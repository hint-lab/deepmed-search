"use client"
import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { IUser } from '@/types/user';

// 定义用户上下文类型
interface UserContextType {
    // 用户信息
    userInfo: IUser | null;
    // 加载状态
    isLoading: boolean;
    // 是否已登录
    isAuthenticated: boolean;
    // 清除用户信息
    clearUserInfo: () => void;
    // 更新用户信息
    updateUserInfo: (user: Partial<IUser>) => void;
    // 刷新用户信息
    refreshUserInfo: () => Promise<void>;
}

// 创建上下文
const UserContext = createContext<UserContextType | undefined>(undefined);

// 用户信息 Hook
const useUserInfo = () => {
    const { data: session } = useSession();
    const [userInfo, setUserInfo] = useState<IUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 从 localStorage 获取用户信息
    const loadUserFromStorage = () => {
        try {
            const storedUserInfo = localStorage.getItem('userInfo');
            if (storedUserInfo) {
                return JSON.parse(storedUserInfo);
            }
        } catch (error) {
            console.error('解析用户信息失败:', error);
        }
        return null;
    };

    // 保存用户信息到 localStorage
    const saveUserToStorage = (user: IUser) => {
        localStorage.setItem('userInfo', JSON.stringify(user));
    };

    // 初始化用户信息
    useEffect(() => {
        setIsLoading(true);
        
        // 首先尝试从 localStorage 加载
        const storedUser = loadUserFromStorage();
        if (storedUser) {
            setUserInfo(storedUser);
        }

        // 如果 session 中有用户信息，更新到 localStorage
        if (session?.user) {
            const newUserInfo = {
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
                image: session.user.image
            } as IUser;
            
            saveUserToStorage(newUserInfo);
            setUserInfo(newUserInfo);
        }
        
        setIsLoading(false);
    }, [session]);

    // 清除用户信息
    const clearUserInfo = () => {
        localStorage.removeItem('userInfo');
        setUserInfo(null);
    };

    // 更新用户信息
    const updateUserInfo = (user: Partial<IUser>) => {
        if (userInfo) {
            const updatedUser = { ...userInfo, ...user };
            setUserInfo(updatedUser);
            saveUserToStorage(updatedUser);
        }
    };

    // 刷新用户信息
    const refreshUserInfo = async () => {
        setIsLoading(true);
        try {
            // 这里可以添加从服务器获取最新用户信息的逻辑
            // 例如: const response = await fetch('/api/user');
            // const data = await response.json();
            // setUserInfo(data);
            
            // 暂时只重新加载 session 中的信息
            if (session?.user) {
                const newUserInfo = {
                    id: session.user.id,
                    name: session.user.name,
                    email: session.user.email,
                    image: session.user.image
                } as IUser;
                
                saveUserToStorage(newUserInfo);
                setUserInfo(newUserInfo);
            }
        } catch (error) {
            console.error('刷新用户信息失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        userInfo,
        isLoading,
        isAuthenticated: !!userInfo,
        clearUserInfo,
        updateUserInfo,
        refreshUserInfo
    };
};

// 用户上下文提供者
export function UserProvider({ children }: { children: ReactNode }) {
    const userContext = useUserInfo();

    return (
        <UserContext.Provider value={userContext}>
            {children}
        </UserContext.Provider>
    );
}

// 用户上下文 Hook
export function useUser() {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error('useUser must be used within a UserProvider');
    }
    return context;
} 