# 构建阶段 - 使用标准 Node 镜像替代 Alpine
FROM node:18-bullseye-slim AS builder

# 1. 安装系统依赖
RUN apt-get update && apt-get install -y \
    openssl \
    curl \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 拷贝依赖定义
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 拷贝源码
COPY . .

# 构建项目
RUN pnpm build

# 生产阶段 - 同样使用标准 Node 镜像
FROM node:18-bullseye-slim

WORKDIR /app

# 激活 pnpm
RUN corepack enable

# 拷贝构建结果和依赖
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 3002

CMD ["node", "dist/main.js"]