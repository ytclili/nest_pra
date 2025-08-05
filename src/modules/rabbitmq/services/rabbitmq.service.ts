import { Injectable, Logger } from "@nestjs/common"
import type { DelayQueueService } from "./delay-queue.service"
import type { FanoutQueueService } from "./fanout-queue.service"
import type { TopicQueueService } from "./topic-queue.service"
import type { DeadLetterQueueService } from "./dead-letter-queue.service"
import type { PriorityQueueService } from "./priority-queue.service"
import type { WorkQueueService } from "./work-queue.service"
import type { RabbitMQManagementService } from "./rabbitmq-management.service"
import type { MessageHandler, PublishOptions } from "../interfaces/rabbitmq.interface"

/**
 * RabbitMQ 统一服务
 * 提供所有队列类型的统一接口
 */
@Injectable()
export class RabbitMQService {
  private readonly logger = new Logger(RabbitMQService.name)

  constructor(
    private readonly delayQueue: DelayQueueService,
    private readonly fanoutQueue: FanoutQueueService,
    private readonly topicQueue: TopicQueueService,
    private readonly deadLetterQueue: DeadLetterQueueService,
    private readonly priorityQueue: PriorityQueueService,
    private readonly workQueue: WorkQueueService,
    private readonly management: RabbitMQManagementService,
  ) {}

  // ==================== 延迟队列 ====================

  /**
   * 发送延迟消息
   */
  async sendDelayMessage<T>(queue: string, data: T, delayMs: number, options?: PublishOptions): Promise<boolean> {
    return this.delayQueue.sendDelayMessage(queue, data, delayMs, options)
  }

  /**
   * 消费延迟队列
   */
  async consumeDelayQueue<T>(queue: string, handler: MessageHandler<T>): Promise<void> {
    return this.delayQueue.consumeDelayQueue(queue, handler)
  }

  // ==================== 广播队列 ====================

  /**
   * 广播消息
   */
  async broadcast<T>(exchange: string, data: T, options?: PublishOptions): Promise<boolean> {
    return this.fanoutQueue.broadcast(exchange, data, options)
  }

  /**
   * 绑定队列到广播交换机
   */
  async bindToFanout(exchange: string, queue: string): Promise<void> {
    return this.fanoutQueue.bindQueueToFanout(exchange, queue)
  }

  /**
   * 消费广播队列
   */
  async consumeFanoutQueue<T>(queue: string, handler: MessageHandler<T>): Promise<void> {
    return this.fanoutQueue.consumeFanoutQueue(queue, handler)
  }

  // ==================== 主题队列 ====================

  /**
   * 发布主题消息
   */
  async publishTopic<T>(exchange: string, routingKey: string, data: T, options?: PublishOptions): Promise<boolean> {
    return this.topicQueue.publishTopic(exchange, routingKey, data, options)
  }

  /**
   * 绑定队列到主题交换机
   */
  async bindToTopic(exchange: string, queue: string, routingPattern: string): Promise<void> {
    return this.topicQueue.bindQueueToTopic(exchange, queue, routingPattern)
  }

  /**
   * 消费主题队列
   */
  async consumeTopicQueue<T>(queue: string, handler: MessageHandler<T>): Promise<void> {
    return this.topicQueue.consumeTopicQueue(queue, handler)
  }

  // ==================== 优先级队列 ====================

  /**
   * 发送优先级消息
   */
  async sendPriorityMessage<T>(queue: string, data: T, priority: number, options?: PublishOptions): Promise<boolean> {
    return this.priorityQueue.sendPriorityMessage(queue, data, priority, options)
  }

  /**
   * 消费优先级队列
   */
  async consumePriorityQueue<T>(queue: string, handler: MessageHandler<T>): Promise<void> {
    return this.priorityQueue.consumePriorityQueue(queue, handler)
  }

  // ==================== 工作队列 ====================

  /**
   * 发送工作任务
   */
  async sendWork<T>(queue: string, data: T, options?: PublishOptions): Promise<boolean> {
    return this.workQueue.sendWork(queue, data, options)
  }

  /**
   * 消费工作队列
   */
  async consumeWork<T>(queue: string, handler: MessageHandler<T>, workerId?: string): Promise<void> {
    return this.workQueue.consumeWork(queue, handler, workerId)
  }

  /**
   * 启动多个工作者
   */
  async startWorkers<T>(queue: string, handler: MessageHandler<T>, workerCount = 3): Promise<void> {
    return this.workQueue.startMultipleWorkers(queue, handler, workerCount)
  }

  // ==================== 死信队列 ====================

  /**
   * 消费队列 (带重试机制)
   */
  async consumeWithRetry<T>(queue: string, handler: MessageHandler<T>, maxRetries = 3): Promise<void> {
    return this.deadLetterQueue.consumeWithRetry(queue, handler, maxRetries)
  }

  /**
   * 消费死信队列
   */
  async consumeDeadLetterQueue<T>(originalQueue: string, handler: MessageHandler<T>): Promise<void> {
    return this.deadLetterQueue.consumeDeadLetterQueue(originalQueue, handler)
  }

  // ==================== 管理功能 ====================

  /**
   * 健康检查
   */
  async healthCheck() {
    return this.management.healthCheck()
  }

  /**
   * 获取队列统计信息
   */
  async getQueueStats(queue: string) {
    return this.management.getQueueStats(queue)
  }

  /**
   * 获取系统概览
   */
  async getSystemOverview() {
    return this.management.getSystemOverview()
  }

  // ==================== 便捷方法 ====================

  /**
   * 发送邮件任务
   */
  async sendEmailTask(emailData: {
    to: string
    subject: string
    content: string
    priority?: "high" | "normal" | "low"
  }): Promise<boolean> {
    const priority = emailData.priority === "high" ? 10 : emailData.priority === "low" ? 1 : 5

    return this.sendPriorityMessage("email-tasks", emailData, priority)
  }

  /**
   * 发送短信任务
   */
  async sendSMSTask(smsData: {
    phone: string
    message: string
    urgent?: boolean
  }): Promise<boolean> {
    const priority = smsData.urgent ? 10 : 5
    return this.sendPriorityMessage("sms-tasks", smsData, priority)
  }

  /**
   * 发送推送通知
   */
  async sendPushNotification(pushData: {
    userId: string
    title: string
    body: string
    data?: any
  }): Promise<boolean> {
    return this.sendWork("push-notifications", pushData)
  }

  /**
   * 发送定时任务
   */
  async scheduleTask<T>(taskName: string, data: T, executeAt: Date): Promise<boolean> {
    const delay = executeAt.getTime() - Date.now()

    if (delay <= 0) {
      throw new Error("执行时间必须在未来")
    }

    return this.sendDelayMessage(
      "scheduled-tasks",
      {
        taskName,
        data,
        executeAt: executeAt.toISOString(),
      },
      delay,
    )
  }

  /**
   * 发布系统事件
   */
  async publishEvent(eventType: string, eventData: any): Promise<boolean> {
    return this.publishTopic("system-events", eventType, {
      type: eventType,
      data: eventData,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * 广播系统通知
   */
  async broadcastSystemNotification(notification: {
    type: "maintenance" | "update" | "alert"
    title: string
    message: string
  }): Promise<boolean> {
    return this.broadcast("system-notifications", {
      ...notification,
      timestamp: new Date().toISOString(),
    })
  }
}
