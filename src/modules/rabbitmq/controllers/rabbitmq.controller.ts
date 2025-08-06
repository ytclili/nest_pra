import { Controller, Get, Post, Body, Param, UseGuards } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger"
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard"

import { RabbitMQService } from "../services/rabbitmq.service"

/**
 * RabbitMQ 管理控制器
 * 提供队列管理和监控接口
 */
@ApiTags("RabbitMQ")
@Controller("rabbitmq")
@ApiBearerAuth()
export class RabbitMQController {
  constructor(private readonly rabbitMQService: RabbitMQService) {}

  /**
   * 健康检查
   */
  @Get("health")
  @ApiOperation({ summary: "RabbitMQ 健康检查" })
  async healthCheck() {
    return this.rabbitMQService.healthCheck()
  }

  /**
   * 获取系统概览
   */
  @Get("overview")
  @ApiOperation({ summary: "获取 RabbitMQ 系统概览" })
  async getOverview() {
    return this.rabbitMQService.getSystemOverview()
  }

  /**
   * 获取队列统计信息
   */
  @Get('queues/:name/stats')
  @ApiOperation({ summary: '获取队列统计信息' })
  async getQueueStats(@Param('name') name: string) {
    return this.rabbitMQService.getQueueStats(name)
  }

  /**
   * 发送测试消息
   */
  @Post('test/send')
  @ApiOperation({ summary: '发送测试消息' })
  async sendTestMessage(@Body() body: {
    type: 'work' | 'delay' | 'priority' | 'fanout' | 'topic'
    queue?: string
    exchange?: string
    routingKey?: string
    data: any
    delay?: number
    priority?: number
  }) {
    const { type, queue, exchange, routingKey, data, delay, priority } = body

    switch (type) {
      case 'work':
        return this.rabbitMQService.sendWork(queue!, data)
      
      case 'delay':
        return this.rabbitMQService.sendDelayMessage(queue!, data, delay || 5000)
      
      case 'priority':
        return this.rabbitMQService.sendPriorityMessage(queue!, data, priority || 5)
      
      case 'fanout':
        return this.rabbitMQService.broadcast(exchange!, data)
      
      case 'topic':
        return this.rabbitMQService.publishTopic(exchange!, routingKey!, data)
      
      default:
        throw new Error('不支持的消息类型')
    }
  }

  /**
   * 发送邮件任务
   */
  @Post('tasks/email')
  @ApiOperation({ summary: '发送邮件任务' })
  async sendEmailTask(@Body() emailData: {
    to: string
    subject: string
    content: string
    priority?: 'high' | 'normal' | 'low'
  }) {
    return this.rabbitMQService.sendEmailTask(emailData)
  }

  /**
   * 发送短信任务
   */
  @Post('tasks/sms')
  @ApiOperation({ summary: '发送短信任务' })
  async sendSMSTask(@Body() smsData: {
    phone: string
    message: string
    urgent?: boolean
  }) {
    return this.rabbitMQService.sendSMSTask(smsData)
  }

  /**
   * 发送推送通知
   */
  @Post('notifications/push')
  @ApiOperation({ summary: '发送推送通知' })
  async sendPushNotification(@Body() pushData: {
    userId: string
    title: string
    body: string
    data?: any
  }) {
    return this.rabbitMQService.sendPushNotification(pushData)
  }

  /**
   * 发布系统事件
   */
  @Post('events/publish')
  @ApiOperation({ summary: '发布系统事件' })
  async publishEvent(@Body() eventData: {
    eventType: string
    data: any
  }) {
    return this.rabbitMQService.publishEvent(eventData.eventType, eventData.data)
  }

  /**
   * 广播系统通知
   */
  @Post('notifications/broadcast')
  @ApiOperation({ summary: '广播系统通知' })
  async broadcastNotification(@Body() notification: {
    type: 'maintenance' | 'update' | 'alert'
    title: string
    message: string
  }) {
    return this.rabbitMQService.broadcastSystemNotification(notification)
  }

  /**
   * 定时任务
   */
  @Post('tasks/schedule')
  @ApiOperation({ summary: '创建定时任务' })
  async scheduleTask(@Body() taskData: {
    taskName: string
    data: any
    executeAt: string
  }) {
    const executeAt = new Date(taskData.executeAt)
    return this.rabbitMQService.scheduleTask(
      taskData.taskName,
      taskData.data,
      executeAt
    )
  }
}
