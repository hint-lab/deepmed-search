import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// 需要认证的路由
const protectedRoutes = [
    '/knowledgebase',
    '/chat',
    '/agent',
    '/files',
    '/search',
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

    const pathname = request.nextUrl.pathname;

    // 检查是否是公开路由
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

    // 检查是否是受保护的路由
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

    // 如果是公开路由，直接放行
    if (isPublicRoute) {
        return NextResponse.next();
    }

    // 如果是受保护的路由且未登录，重定向到登录页
    if (isProtectedRoute && !token) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // 如果已登录且访问登录页，重定向到主页
    if (token && pathname === '/login') {
        return NextResponse.redirect(new URL('/knowledgebase', request.url));
    }

    return NextResponse.next();
}

// 配置中间件匹配的路由
export const config = {
    matcher: [
        // 匹配所有需要保护的路由
        '/knowledgebase/:path*',
        '/chat/:path*',
        '/agent/:path*',
        '/files/:path*',
        '/search/:path*',
        // 匹配登录和注册页面
        '/login',
        '/register',
        // 匹配根路径
        '/',
    ]
}; 