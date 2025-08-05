import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy } from "@nestjs/common"
import type { ConfigService } from "@nestjs/config"
import * as amqp from "amqplib"

/**
 * RabbitMQ 连接服务
 * 负责管理与RabbitMQ服务器的连接
 */
@Injectable()
export class RabbitMQConnectionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQConnectionService.name)
  private connection: amqp.Connection | null = null
  private channel: amqp.Channel | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private readonly maxReconnectAttempts = 10
  private readonly reconnectDelay = 5000

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    await this.connect()
  }

  async onModuleDestroy() {
    await this.disconnect()
  }

  /**
   * 连接到RabbitMQ服务器
   */
  async connect(): Promise<void> {
    try {
      const url = this.buildConnectionUrl()

      this.logger.log("正在连接到 RabbitMQ...")

      // 创建连接
      this.connection = await amqp.connect(url, {
        heartbeat: 60,
        clientProperties: {
          connection_name: `nestjs-app-${process.env.NODE_ENV || "development"}`,
        },
      })

      // 创建通道
      this.channel = await this.connection.createChannel()

      // 设置通道预取数量（QoS）
      await this.channel.prefetch(this.configService.get("RABBITMQ_PREFETCH_COUNT", 10))

      // 监听连接事件
      this.setupConnectionEventListeners()

      this.isConnected = true
      this.reconnectAttempts = 0

      this.logger.log("✅ RabbitMQ 连接成功")
    } catch (error) {
      this.logger.error("❌ RabbitMQ 连接失败:", error.message)
      await this.handleReconnect()
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close()
        this.channel = null
      }

      if (this.connection) {
        await this.connection.close()
        this.connection = null
      }

      this.isConnected = false
      this.logger.log("RabbitMQ 连接已断开")
    } catch (error) {
      this.logger.error("断开 RabbitMQ 连接时出错:", error.message)
    }
  }

  /**
   * 获取通道
   */
  getChannel(): amqp.Channel {
    if (!this.channel || !this.isConnected) {
      throw new Error("RabbitMQ 连接未建立或通道不可用")
    }
    return this.channel
  }

  /**
   * 获取连接
   */
  getConnection(): amqp.Connection {
    if (!this.connection || !this.isConnected) {
      throw new Error("RabbitMQ 连接未建立")
    }
    return this.connection
  }

  /**
   * 检查连接状态
   */
  isConnectionReady(): boolean {
    return this.isConnected && !!this.channel && !!this.connection
  }

  /**
   * 构建连接URL
   */
  private buildConnectionUrl(): string {
    const host = this.configService.get("RABBITMQ_HOST", "localhost")
    const port = this.configService.get("RABBITMQ_PORT", 5672)
    const username = this.configService.get("RABBITMQ_USERNAME", "guest")
    const password = this.configService.get("RABBITMQ_PASSWORD", "guest")
    const vhost = this.configService.get("RABBITMQ_VHOST", "/")

    return `amqp://${username}:${password}@${host}:${port}${vhost}`
  }

  /**
   * 设置连接事件监听器
   */
  private setupConnectionEventListeners(): void {
    if (!this.connection) return

    // 连接关闭事件
    this.connection.on("close", (error) => {
      this.logger.warn("RabbitMQ 连接关闭", error?.message)
      this.isConnected = false
      this.handleReconnect()
    })

    // 连接错误事件
    this.connection.on("error", (error) => {
      this.logger.error("RabbitMQ 连接错误:", error.message)
      this.isConnected = false
    })

    // 连接阻塞事件
    this.connection.on("blocked", (reason) => {
      this.logger.warn("RabbitMQ 连接被阻塞:", reason)
    })

    // 连接解除阻塞事件
    this.connection.on("unblocked", () => {
      this.logger.log("RabbitMQ 连接解除阻塞")
    })

    // 通道错误事件
    if (this.channel) {
      this.channel.on("error", (error) => {
        this.logger.error("RabbitMQ 通道错误:", error.message)
      })

      this.channel.on("close", () => {
        this.logger.warn("RabbitMQ 通道关闭")
      })
    }
  }

  /**
   * 处理重连逻辑
   */
  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error(`重连失败，已达到最大重连次数 ${this.maxReconnectAttempts}`)
      return
    }

    this.reconnectAttempts++
    this.logger.log(`尝试重连 RabbitMQ (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    setTimeout(async () => {
      try {
        await this.connect()
      } catch (error) {
        this.logger.error("重连失败:", error.message)
      }
    }, this.reconnectDelay * this.reconnectAttempts)
  }
}
