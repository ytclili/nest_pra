# 构建阶段 - 使用最新版 Node 镜像
FROM node:latest AS builder

WORKDIR /app

# 确保使用最新版 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 拷贝依赖定义
COPY package.json pnpm-lock.yaml ./

# 安装依赖
RUN pnpm install --frozen-lockfile

# 拷贝源码
COPY . .

# 构建项目
RUN pnpm build

# 生产阶段 - 命名为 production 以匹配 compose 配置
FROM node:latest AS production

WORKDIR /app

# 激活 pnpm
RUN corepack enable

# 拷贝构建结果和依赖
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

EXPOSE 3002

CMD ["node", "dist/main.js"]