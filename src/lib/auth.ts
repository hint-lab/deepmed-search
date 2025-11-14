import NextAuth, { DefaultSession, User, Account, Profile } from "next-auth";
import Github from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
        } & DefaultSession["user"]
    }
}

const prisma = new PrismaClient();

////////////////////////////////////////////

// 构建 providers 数组 - 只包含已配置的 provider
const providers: any[] = [
    CredentialsProvider({
        name: "credentials",
        credentials: {
            email: { label: "Email", type: "email" },
            password: { label: "Password", type: "password" }
        },
        async authorize(credentials) {
            if (!credentials?.email || !credentials?.password) {
                return null;
            }

            const user = await prisma.user.findUnique({
                where: {
                    email: credentials.email as string,
                },
            });

            if (!user) {
                return null;
            }

            const isPasswordValid = await compare(
                credentials.password as string,
                user.password
            );

            if (!isPasswordValid) {
                return null;
            }

            return {
                id: user.id.toString(),
                email: user.email,
                name: user.name || user.email,
                image: user.image || null,
            };
        }
    }),
];

// 只在配置了环境变量时才添加 Google OAuth
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    providers.push(
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                }
            }
        })
    );
} else {
    console.warn('[Auth] Google OAuth not configured - GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing');
}

// 只在配置了环境变量时才添加 Github OAuth
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    providers.push(
        Github({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
        })
    );
} else {
    console.warn('[Auth] Github OAuth not configured - GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET missing');
}

// 直接将配置内联在此文件中，不再依赖外部 authConfig
export const authConfig = {
    trustHost: true, // 允许从环境变量或请求头中获取 URL
    providers,
    session: {
        strategy: "jwt" as const,
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
        signIn: "/login",
        error: "/error",
    },
    debug: process.env.NODE_ENV === 'development',
    callbacks: {
        async signIn({ user, account, profile }: { user: User; account: Account | null; profile?: Profile }) {
            // OAuth 登录时创建或更新用户
            if (account?.provider === 'google' || account?.provider === 'github') {
                try {
                    const existingUser = await prisma.user.findUnique({
                        where: { email: user.email! }
                    });

                    if (!existingUser) {
                        // 创建新用户
                        const newUser = await prisma.user.create({
                            data: {
                                email: user.email!,
                                name: user.name || user.email!,
                                image: user.image,
                                password: '', // OAuth 用户不需要密码
                            }
                        });
                        user.id = newUser.id.toString();
                    } else {
                        user.id = existingUser.id.toString();
                    }
                } catch (error) {
                    console.error('[Auth] Error creating/updating user:', error);
                    return false;
                }
            }
            return true;
        },
        async jwt({ token, user }: { token: any; user: User | null }) {
            if (user) {
                token.id = user.id;
                token.name = user.name;
                token.email = user.email;
                token.image = user.image;
            }
            return token;
        },
        async session({ session, token }: { session: any; token: any }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.name = token.name;
                session.user.email = token.email;
                session.user.image = token.image;
            }
            return session;
        },
    },
    secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);