import NextAuth, { DefaultSession, User, Account, Profile } from "next-auth";
import Github from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
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

// 直接将配置内联在此文件中，不再依赖外部 authConfig
export const authConfig = {
    providers: [
        Credentials({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("请输入邮箱和密码");
                }

                try {
                    const user = await prisma.user.findUnique({
                        where: {
                            email: credentials.email as string,
                        },
                    });

                    if (!user) {
                        throw new Error("用户不存在");
                    }

                    const isPasswordValid = await compare(
                        credentials.password as string,
                        user.password
                    );

                    if (!isPasswordValid) {
                        throw new Error("密码错误");
                    }

                    return {
                        id: user.id.toString(),
                        email: user.email,
                        name: user.name || user.email,
                        image: user.image || null,
                    };
                } catch (error) {
                    console.error("登录错误:", error);
                    throw error;
                }
            }
        }),
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            allowDangerousEmailAccountLinking: true,
        }),
        Github({
            clientId: process.env.GITHUB_CLIENT_ID || "",
            clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
            allowDangerousEmailAccountLinking: true,
        }),
    ],
    session: {
        strategy: "jwt" as const,
    },
    // 自定义页面配置
    pages: {
        signIn: "/login",
        error: "/error",
    },
    // 添加默认重定向路径
    redirects: {
        signIn: "/knowledge-base",
    },

    events: {
        signIn({ user, account, profile, isNewUser }: {
            user: User;
            account: Account | null;
            profile?: Profile;
            isNewUser?: boolean;
        }) {
            console.log("User: ", user);
            console.log("Account: ", account);
            console.log("Profile: ", profile);
            console.log("isNewUser: ", isNewUser);
        },
    },

    callbacks: {
        async jwt({ token, user }: { token: any; user: User | null }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }: { session: any; token: any }) {
            if (session.user) {
                session.user.id = token.id as string;
            }
            return session;
        },
    },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);