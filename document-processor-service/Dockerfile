# 使用 Node.js 20作为基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 设置 npm 和 yarn 镜像源
RUN npm config set registry https://registry.npmmirror.com && \
    yarn config set registry https://registry.npmmirror.com

# 设置 Alpine 镜像源
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装系统依赖
RUN apk add --no-cache \
    make \
    g++ \
    redis

# 复制 package.json 和 yarn.lock
COPY package.json yarn.lock ./

# 安装依赖
RUN yarn install

# 复制源代码
COPY . .

# 创建存储目录
RUN mkdir -p /app/storage && \
    chmod 777 /app/storage

# 构建 TypeScript
RUN yarn build

# 暴露端口
EXPOSE 5001

# 启动命令
CMD ["yarn", "start"] 