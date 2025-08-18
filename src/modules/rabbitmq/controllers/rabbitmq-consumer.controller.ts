import { Controller, Post, Get, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BusinessConsumer } from '../consumers/business.consumer';
import { RabbitMQEasyService } from '../services/rabbitmq-easy.service';

@ApiTags('RabbitMQ 消费者管理')
@Controller('rabbitmq/consumer')
export class RabbitMQConsumerController {
  private readonly logger = new Logger(RabbitMQConsumerController.name);

  constructor(
    private readonly businessConsumer: BusinessConsumer,
    private readonly rabbitMQEasyService: RabbitMQEasyService,
  ) {}

  @Post('start')
  @ApiOperation({ summary: '启动所有消费者' })
  @ApiResponse({ status: 200, description: '消费者启动成功' })
  async startConsumers() {
    try {
      await this.businessConsumer.startAllConsumers();
      return {
        success: true,
        message: '所有消费者启动成功',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('启动消费者失败:', error.message);
      return {
        success: false,
        message: `启动消费者失败: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('stop')
  @ApiOperation({ summary: '停止所有消费者' })
  @ApiResponse({ status: 200, description: '消费者停止成功' })
  async stopConsumers() {
    try {
      this.businessConsumer.stopAllConsumers();
      return {
        success: true,
        message: '所有消费者停止成功',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('停止消费者失败:', error.message);
      return {
        success: false,
        message: `停止消费者失败: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('status')
  @ApiOperation({ summary: '获取消费者状态' })
  @ApiResponse({ status: 200, description: '获取状态成功' })
  async getConsumerStatus() {
    try {
      const status = this.businessConsumer.getStatus();
      return {
        success: true,
        data: status,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('获取消费者状态失败:', error.message);
      return {
        success: false,
        message: `获取状态失败: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('start/email')
  @ApiOperation({ summary: '启动邮件消费者' })
  async startEmailConsumer() {
    try {
      await this.businessConsumer.startEmailConsumer();
      return {
        success: true,
        message: '邮件消费者启动成功',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: `邮件消费者启动失败: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('start/sms')
  @ApiOperation({ summary: '启动短信消费者' })
  async startSMSConsumer() {
    try {
      await this.businessConsumer.startSMSConsumer();
      return {
        success: true,
        message: '短信消费者启动成功',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: `短信消费者启动失败: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('start/image')
  @ApiOperation({ summary: '启动图片处理消费者' })
  async startImageConsumer() {
    try {
      await this.businessConsumer.startImageProcessingConsumer();
      return {
        success: true,
        message: '图片处理消费者启动成功',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: `图片处理消费者启动失败: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('start/events')
  @ApiOperation({ summary: '启动事件消费者' })
  async startEventConsumers() {
    try {
      await Promise.all([
        this.businessConsumer.startUserEventConsumer(),
        this.businessConsumer.startOrderEventConsumer(),
      ]);
      return {
        success: true,
        message: '事件消费者启动成功',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: `事件消费者启动失败: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('start/multi-worker')
  @ApiOperation({ summary: '启动多工作者消费者示例' })
  async startMultiWorkerExample() {
    try {
      await this.businessConsumer.startMultiWorkerExample();
      return {
        success: true,
        message: '多工作者消费者启动成功',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: `多工作者消费者启动失败: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('test/custom-consumer')
  @ApiOperation({ summary: '测试自定义消费者' })
  async testCustomConsumer(
    @Body() body: { queueName: string; workerCount?: number },
  ) {
    try {
      const { queueName, workerCount = 1 } = body;

      this.logger.log(
        `启动自定义消费者: ${queueName}, 工作者数量: ${workerCount}`,
      );

      // 启动自定义消费者
      await this.rabbitMQEasyService.startMultipleWorkers(
        queueName,
        async (data: any) => {
          this.logger.log(`处理自定义队列消息:`, data);

          // 模拟处理时间
          await new Promise((resolve) => setTimeout(resolve, 1000));

          this.logger.log(`自定义队列消息处理完成`);
        },
        workerCount,
        { prefetch: 1 },
      );

      return {
        success: true,
        message: `自定义消费者启动成功: ${queueName}`,
        data: { queueName, workerCount },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        message: `自定义消费者启动失败: ${error.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
