'use server';

import { hash } from 'bcryptjs';
import { prisma } from '../lib/prisma';

interface RegisterFormData {
    name: string;
    email: string;
    password: string;
}

interface RegisterResponse {
    success: boolean;
    error?: string;
}

export async function registerUser(formData: RegisterFormData): Promise<RegisterResponse> {
    try {
        // 检查用户是否已存在
        const existingUser = await prisma.user.findUnique({
            where: {
                email: formData.email,
            },
        });

        if (existingUser) {
            return {
                success: false,
                error: 'User already exists',
            };
        }

        // 密码加密
        const hashedPassword = await hash(formData.password, 10);

        // 随机选择头像 (1-4)
        const randomAvatarIndex = Math.floor(Math.random() * 4) + 1;
        const avatarPath = `/assets/avatar/${randomAvatarIndex}.svg`;

        // 创建新用户
        await prisma.user.create({
            data: {
                name: formData.name,
                email: formData.email,
                password: hashedPassword,
                image: avatarPath, // 设置随机头像
            },
        });

        return {
            success: true,
        };
    } catch (error) {
        console.error('Registration failed:', error);
        return {
            success: false,
            error: 'Registration failed. Please try again later.',
        };
    }
}
