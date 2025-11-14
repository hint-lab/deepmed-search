##### deps #####
FROM node:20-bookworm AS deps

WORKDIR /app

# 配置 Debian 国内镜像源（加速包下载）
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources \
 && sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources

# 启用 corepack 并配置 yarn
RUN corepack enable \
 && corepack prepare yarn@1.22.22 --activate \
 && yarn config set registry https://registry.npmmirror.com

# 复制依赖文件
COPY package.json yarn.lock ./

# 安装依赖（忽略脚本，避免在构建阶段执行 postinstall）
RUN yarn install --frozen-lockfile --ignore-scripts

##### builder #####
FROM deps AS builder

# 复制所有源代码
COPY . .

# 生成 Prisma Client 并构建 Next.js 应用
RUN yarn prisma generate \
 && yarn build

##### runner #####
FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NODE_OPTIONS=--max-old-space-size=2048 \
    NEXT_TELEMETRY_DISABLED=1

# 配置 Debian 国内镜像源（加速包下载）
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources \
 && sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources

# 安装 dumb-init 和 curl（用于健康检查）
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
    dumb-init \
    ca-certificates \
    curl \
 && rm -rf /var/lib/apt/lists/*

# 创建非 root 用户
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 nextjs

# 复制 package.json 和 yarn.lock
COPY package.json yarn.lock ./

# 启用 corepack 并安装生产依赖
RUN corepack enable \
 && corepack prepare yarn@1.22.22 --activate \
 && yarn config set registry https://registry.npmmirror.com \
 && yarn install --frozen-lockfile --ignore-scripts --production=true

# 从 builder 阶段复制构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 复制 Prisma schema 和生成的 Client（用于运行时数据库操作）
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

ENV PORT=3000 \
    HOSTNAME="0.0.0.0"

# 使用 dumb-init 启动应用
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

