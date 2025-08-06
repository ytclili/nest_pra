import { Injectable, Logger } from "@nestjs/common"
import  { ConfigService } from "@nestjs/config"
import  { RabbitMQCoreService } from "./rabbitmq-core.service"
import  { QueueStats } from "../interfaces/rabbitmq.interface"

/**
 * RabbitMQ 管理服务
 * 提供队列监控、管理和统计功能
 */
@Injectable()
export class RabbitMQManagementService {
  private readonly logger = new Logger(RabbitMQManagementService.name)

  constructor(
    private readonly coreService: RabbitMQCoreService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 获取所有队列统计信息
   */
  async getAllQueuesStats(): Promise<QueueStats[]> {
    // 注意: 这个功能需要 RabbitMQ Management API
    // 这里提供基础实现，实际使用时需要调用 Management API

    try {
      const managementUrl = this.configService.get("RABBITMQ_MANAGEMENT_URL")
      if (!managementUrl) {
        this.logger.warn("未配置 RabbitMQ Management API URL")
        return []
      }

      // 这里应该调用 Management API 获取队列信息
      // const response = await fetch(`${managementUrl}/api/queues`)
      // const queues = await response.json()

      // 临时返回空数组
      return []
    } catch (error) {
      this.logger.error("获取队列统计信息失败:", error.message)
      return []
    }
  }

  /**
   * 获取单个队列统计信息
   */
  async getQueueStats(queueName: string): Promise<QueueStats | null> {
    try {
      const queueInfo = await this.coreService.getQueueInfo(queueName)

      return {
        name: queueName,
        messages: queueInfo.messageCount,
        consumers: queueInfo.consumerCount,
        messageRate: 0, // 需要通过 Management API 获取
        deliverRate: 0, // 需要通过 Management API 获取
      }
    } catch (error) {
      this.logger.error(`获取队列 ${queueName} 统计信息失败:`, error.message)
      return null
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<{
    status: "healthy" | "unhealthy"
    connection: boolean
    queues: number
    errors: string[]
  }> {
    const errors: string[] = []
    let connection = false
    let queues = 0

    try {
      // 检查连接状态
      connection = this.coreService["connectionService"].isConnectionReady()

      if (!connection) {
        errors.push("RabbitMQ 连接不可用")
      }

      // 检查队列数量 (需要 Management API)
      const queueStats = await this.getAllQueuesStats()
      queues = queueStats.length
    } catch (error) {
      errors.push(`健康检查失败: ${error.message}`)
    }

    return {
      status: errors.length === 0 ? "healthy" : "unhealthy",
      connection,
      queues,
      errors,
    }
  }

  /**
   * 清理空队列
   */
  async cleanupEmptyQueues(queueNames: string[]): Promise<{
    cleaned: string[]
    errors: string[]
  }> {
    const cleaned: string[] = []
    const errors: string[] = []

    for (const queueName of queueNames) {
      try {
        const queueInfo = await this.coreService.getQueueInfo(queueName)

        if (queueInfo.messageCount === 0 && queueInfo.consumerCount === 0) {
          await this.coreService.deleteQueue(queueName, { ifEmpty: true })
          cleaned.push(queueName)
        }
      } catch (error) {
        errors.push(`清理队列 ${queueName} 失败: ${error.message}`)
      }
    }

    this.logger.log(`清理完成: ${cleaned.length} 个队列已删除`)

    return { cleaned, errors }
  }

  /**
   * 批量清空队列
   */
  async purgeQueues(queueNames: string[]): Promise<{
    purged: string[]
    errors: string[]
  }> {
    const purged: string[] = []
    const errors: string[] = []

    for (const queueName of queueNames) {
      try {
        await this.coreService.purgeQueue(queueName)
        purged.push(queueName)
      } catch (error) {
        errors.push(`清空队列 ${queueName} 失败: ${error.message}`)
      }
    }

    this.logger.log(`批量清空完成: ${purged.length} 个队列已清空`)

    return { purged, errors }
  }

  /**
   * 获取系统概览
   */
  async getSystemOverview(): Promise<{
    totalQueues: number
    totalMessages: number
    totalConsumers: number
    connectionStatus: boolean
    uptime: number
  }> {
    try {
      const queueStats = await this.getAllQueuesStats()
      const totalMessages = queueStats.reduce((sum, queue) => sum + queue.messages, 0)
      const totalConsumers = queueStats.reduce((sum, queue) => sum + queue.consumers, 0)

      return {
        totalQueues: queueStats.length,
        totalMessages,
        totalConsumers,
        connectionStatus: this.coreService["connectionService"].isConnectionReady(),
        uptime: process.uptime(),
      }
    } catch (error) {
      this.logger.error("获取系统概览失败:", error.message)
      throw error
    }
  }
}
