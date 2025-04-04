import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// 需要认证的路由
const protectedRoutes = [
    '/knowledge-base',
    '/settings',
    '/profile',
];

// 公开路由
const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/api/auth',
];

export async function middleware(request: NextRequest) {
    const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
    });

    // 检查是否是公开路由
    const isPublicRoute = publicRoutes.some(route =>
        request.nextUrl.pathname.startsWith(route)
    );

    // 检查是否是受保护的路由
    const isProtectedRoute = protectedRoutes.some(route =>
        request.nextUrl.pathname.startsWith(route)
    );

    // 如果是公开路由，直接放行
    if (isPublicRoute) {
        return NextResponse.next();
    }

    // 如果是受保护的路由且未登录，重定向到登录页
    if (isProtectedRoute && !token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 如果已登录且访问登录页，重定向到主页
    if (token && request.nextUrl.pathname === '/login') {
        return NextResponse.redirect(new URL('/knowledge-base', request.url));
    }

    return NextResponse.next();
}

// 配置中间件匹配的路由
export const config = {
    matcher: [
        /*
         * 匹配所有路径除了:
         * - api/auth (认证 API 路由)
         * - _next/static (静态文件)
         * - _next/image (图片优化)
         * - favicon.ico (浏览器图标)
         */
        '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
    ],
}; 