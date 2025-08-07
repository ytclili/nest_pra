import { Controller, Post, Get, Body, Query, Logger } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBody } from "@nestjs/swagger"
import { ManualAckDemoService } from "../services/manual-ack-demo.service"

@ApiTags('手动ACK演示')
@Controller('rabbitmq/manual-ack-demo')
export class ManualAckDemoController {
  private readonly logger = new Logger(ManualAckDemoController.name)

  constructor(private readonly manualAckDemoService: ManualAckDemoService) {}

  @Post('init')
  @ApiOperation({ summary: '初始化演示队列' })
  @ApiResponse({ status: 200, description: '初始化成功' })
  async initializeDemo() {
    try {
      await this.manualAckDemoService.initializeDemoQueue()
      return {
        success: true,
        message: '演示队列初始化成功',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      this.logger.error('初始化演示队列失败:', error.message)
      return {
        success: false,
        message: `初始化失败: ${error.message}`,
        timestamp: new Date().toISOString()
      }
    }
  }

  @Post('send-messages')
  @ApiOperation({ summary: '发送演示消息' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', description: '消息数量', default: 10 }
      }
    }
  })
  @ApiResponse({ status: 200, description: '消息发送成功' })
  async sendMessages(@Body() body: { count?: number }) {
    try {
      const count = body.count || 10
      await this.manualAckDemoService.sendDemoMessages(count)
      
      return {
        success: true,
        message: `${count} 条演示消息发送成功`,
        data: { count },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      this.logger.error('发送演示消息失败:', error.message)
      return {
        success: false,
        message: `发送消息失败: ${error.message}`,
        timestamp: new Date().toISOString()
      }
    }
  }

  @Post('start-consumer')
  @ApiOperation({ summary: '启动单个手动ACK消费者' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        prefetch: { type: 'number', description: '预取数量', default: 1 },
        workerId: { type: 'string', description: '工作者ID', default: 'manual-ack-worker' }
      }
    }
  })
  @ApiResponse({ status: 200, description: '消费者启动成功' })
  async startConsumer(@Body() body: { prefetch?: number; workerId?: string }) {
    try {
      const { prefetch = 1, workerId = 'manual-ack-worker' } = body
      
      // 异步启动消费者
      this.manualAckDemoService.startManualAckConsumer({ prefetch, workerId })
        .catch(error => this.logger.error('消费者运行异常:', error.message))
      
      return {
        success: true,
        message: '手动ACK消费者启动成功',
        data: { prefetch, workerId },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      this.logger.error('启动消费者失败:', error.message)
      return {
        success: false,
        message: `启动消费者失败: ${error.message}`,
        timestamp: new Date().toISOString()
      }
    }
  }

  @Post('start-multiple-workers')
  @ApiOperation({ summary: '启动多个手动ACK工作者' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        workerCount: { type: 'number', description: '工作者数量', default: 3 },
        prefetch: { type: 'number', description: '每个工作者的预取数量', default: 1 }
      }
    }
  })
  @ApiResponse({ status: 200, description: '多工作者启动成功' })
  async startMultipleWorkers(@Body() body: { workerCount?: number; prefetch?: number }) {
    try {
      const { workerCount = 3, prefetch = 1 } = body
      
      // 异步启动多个工作者
      this.manualAckDemoService.startMultipleWorkers(workerCount, prefetch)
        .catch(error => this.logger.error('多工作者运行异常:', error.message))
      
      return {
        success: true,
        message: `${workerCount} 个手动ACK工作者启动成功`,
        data: { workerCount, prefetch },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      this.logger.error('启动多工作者失败:', error.message)
      return {
        success: false,
        message: `启动多工作者失败: ${error.message}`,
        timestamp: new Date().toISOString()
      }
    }
  }

  @Post('start-dead-letter-consumer')
  @ApiOperation({ summary: '启动死信队列消费者' })
  @ApiResponse({ status: 200, description: '死信队列消费者启动成功' })
  async startDeadLetterConsumer() {
    try {
      // 异步启动死信队列消费者
      this.manualAckDemoService.startDeadLetterConsumer()
        .catch(error => this.logger.error('死信队列消费者运行异常:', error.message))
      
      return {
        success: true,
        message: '死信队列消费者启动成功',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      this.logger.error('启动死信队列消费者失败:', error.message)
      return {
        success: false,
        message: `启动死信队列消费者失败: ${error.message}`,
        timestamp: new Date().toISOString()
      }
    }
  }

  @Get('stats')
  @ApiOperation({ summary: '获取队列统计信息' })
  @ApiResponse({ status: 200, description: '获取统计信息成功' })
  async getQueueStats() {
    try {
      const stats = await this.manualAckDemoService.getQueueStats()
      
      return {
        success: true,
        data: {
          mainQueue: {
            name: 'manual-ack-demo',
            messages: stats.mainQueue?.messageCount || 0,
            consumers: stats.mainQueue?.consumerCount || 0,
          },
          deadLetterQueue: {
            name: 'dlq.manual-ack-demo',
            messages: stats.deadLetterQueue?.messageCount || 0,
            consumers: stats.deadLetterQueue?.consumerCount || 0,
          }
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      this.logger.error('获取队列统计失败:', error.message)
      return {
        success: false,
        message: `获取统计失败: ${error.message}`,
        timestamp: new Date().toISOString()
      }
    }
  }

  @Post('clear-queues')
  @ApiOperation({ summary: '清空所有演示队列' })
  @ApiResponse({ status: 200, description: '队列清空成功' })
  async clearQueues() {
    try {
      await this.manualAckDemoService.clearAllQueues()
      
      return {
        success: true,
        message: '所有演示队列已清空',
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      this.logger.error('清空队列失败:', error.message)
      return {
        success: false,
        message: `清空队列失败: ${error.message}`,
        timestamp: new Date().toISOString()
      }
    }
  }

  @Post('full-demo')
  @ApiOperation({ summary: '完整演示流程' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        messageCount: { type: 'number', description: '消息数量', default: 20 },
        workerCount: { type: 'number', description: '工作者数量', default: 3 },
        prefetch: { type: 'number', description: '预取数量', default: 1 }
      }
    }
  })
  @ApiResponse({ status: 200, description: '完整演示启动成功' })
  async runFullDemo(@Body() body: { 
    messageCount?: number
    workerCount?: number
    prefetch?: number 
  }) {
    try {
      const { messageCount = 20, workerCount = 3, prefetch = 1 } = body

      this.logger.log('🚀 开始完整的手动ACK演示流程...')

      // 1. 初始化队列
      await this.manualAckDemoService.initializeDemoQueue()
      this.logger.log('✅ 步骤1: 队列初始化完成')

      // 2. 发送消息
      await this.manualAckDemoService.sendDemoMessages(messageCount)
      this.logger.log(`✅ 步骤2: ${messageCount} 条消息发送完成`)

      // 3. 启动工作者（异步）
      setTimeout(() => {
        this.manualAckDemoService.startMultipleWorkers(workerCount, prefetch)
          .catch(error => this.logger.error('工作者运行异常:', error.message))
      }, 1000)
      this.logger.log(`✅ 步骤3: ${workerCount} 个工作者启动中...`)

      // 4. 启动死信队列消费者（异步）
      setTimeout(() => {
        this.manualAckDemoService.startDeadLetterConsumer()
          .catch(error => this.logger.error('死信队列消费者运行异常:', error.message))
      }, 2000)
      this.logger.log('✅ 步骤4: 死信队列消费者启动中...')

      return {
        success: true,
        message: '完整演示流程启动成功',
        data: {
          messageCount,
          workerCount,
          prefetch,
          steps: [
            '队列初始化完成',
            `${messageCount} 条消息发送完成`,
            `${workerCount} 个工作者启动中`,
            '死信队列消费者启动中'
          ]
        },
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      this.logger.error('完整演示流程失败:', error.message)
      return {
        success: false,
        message: `完整演示流程失败: ${error.message}`,
        timestamp: new Date().toISOString()
      }
    }
  }
}
