/**
 * PM2 生态系统配置文件
 * 用于生产环境的进程管理和集群模式
 */
module.exports = {
  apps: [
    {
      // 应用基本信息
      name: "nestjs-auth-api",
      script: "dist/main.js",

      // 集群模式配置
      instances: "max", // 使用所有可用 CPU 核心，也可以设置具体数字如 4
      exec_mode: "cluster", // 集群模式，支持负载均衡

      // 环境变量
      env: {
        NODE_ENV: "production",
        PORT: 3002,
      },

      // 开发环境配置
      env_development: {
        NODE_ENV: "development",
        PORT: 3002,
        watch: true, // 开发环境监听文件变化
        ignore_watch: ["node_modules", "logs", "uploads"],
      },

      // 生产环境配置
      env_production: {
        NODE_ENV: "production",
        PORT: 3002,
      },

      // 进程管理配置
      min_uptime: "10s", // 最小运行时间
      max_restarts: 10, // 最大重启次数
      restart_delay: 4000, // 重启延迟

      // 内存管理
      max_memory_restart: "500M", // 内存超过 500M 时重启

      // 日志配置
      log_file: "./logs/combined.log",
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,

      // 其他配置
      kill_timeout: 5000, // 强制杀死进程的超时时间
      listen_timeout: 3000, // 监听超时时间
      wait_ready: true, // 等待应用准备就绪

      // 健康检查
      health_check_grace_period: 3000,
    },
  ],

  // 部署配置（可选）
  deploy: {
    production: {
      user: "deploy",
      host: ["your-server.com"],
      ref: "origin/main",
      repo: "git@github.com:your-username/nestjs-auth.git",
      path: "/var/www/nestjs-auth",
      "post-deploy": "npm install && npm run build && pm2 reload ecosystem.config.js --env production",
      "pre-setup": "apt update && apt install git -y",
    },
  },
}
