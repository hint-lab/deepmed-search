"use client"
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { IUserInfo } from '@/types/user';


export const useUserInfo = () => {
    const { data: session } = useSession();
    const [userInfo, setUserInfo] = useState<IUserInfo | null>(null);

    useEffect(() => {
        // 从 localStorage 获取用户信息
        const storedUserInfo = localStorage.getItem('userInfo');
        if (storedUserInfo) {
            try {
                const parsedInfo = JSON.parse(storedUserInfo);
                setUserInfo(parsedInfo);
            } catch (error) {
                console.error('解析用户信息失败:', error);
            }
        }

        // 如果 session 中有用户信息，更新到 localStorage
        if (session?.user) {
            const newUserInfo = {
                userId: session.user.id,
                name: session.user.name,
                email: session.user.email,
                image: session.user.image
            };
            localStorage.setItem('userInfo', JSON.stringify(newUserInfo));
            setUserInfo(newUserInfo as IUserInfo);
        }
    }, [session]);

    // 清除用户信息的方法
    const clearUserInfo = () => {
        localStorage.removeItem('userInfo');
        setUserInfo(null);
    };

    return {
        userInfo,
        clearUserInfo,
        isLoading: !userInfo && !!session
    };
}; 