FROM node:20-alpine

WORKDIR /app

# 创建 package.json
COPY package.json /app/package.json

# 安装依赖
RUN npm install

# 创建启动脚本
COPY server.js /app/server.js

EXPOSE 3000

CMD ["node", "server.js"]

