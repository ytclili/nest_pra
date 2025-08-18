import { Injectable, Logger } from '@nestjs/common';
import type { OnModuleInit } from '@nestjs/common';
import type { RabbitMQService } from '../services/rabbitmq.service';
import type { Message } from '../interfaces/rabbitmq.interface';

/**
 * 测试消费者
 * 用于测试各种队列类型的消息消费
 */
@Injectable()
export class TestConsumer implements OnModuleInit {
  private readonly logger = new Logger(TestConsumer.name);

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async onModuleInit() {
    // 延迟启动消费者，确保队列已经设置完成
    setTimeout(() => {
      this.startTestConsumers();
    }, 2000);
  }

  /**
   * 启动测试消费者
   */
  private async startTestConsumers(): Promise<void> {
    try {
      this.logger.log('启动测试消费者...');

      // 消费工作队列
      await this.rabbitMQService.consumeWork(
        'test-work-queue',
        this.handleWorkMessage.bind(this),
        'test-worker',
      );

      // 消费延迟队列
      await this.rabbitMQService.consumeDelayQueue(
        'test-delay-queue',
        this.handleDelayMessage.bind(this),
      );

      // 消费优先级队列
      await this.rabbitMQService.consumePriorityQueue(
        'test-priority-queue',
        this.handlePriorityMessage.bind(this),
      );

      // 消费广播队列
      await this.rabbitMQService.consumeFanoutQueue(
        'test-fanout-queue-1',
        this.handleFanoutMessage1.bind(this),
      );
      await this.rabbitMQService.consumeFanoutQueue(
        'test-fanout-queue-2',
        this.handleFanoutMessage2.bind(this),
      );

      // 消费主题队列
      await this.rabbitMQService.consumeTopicQueue(
        'test-topic-queue-1',
        this.handleTopicMessage1.bind(this),
      );
      await this.rabbitMQService.consumeTopicQueue(
        'test-topic-queue-2',
        this.handleTopicMessage2.bind(this),
      );
      await this.rabbitMQService.consumeTopicQueue(
        'test-topic-queue-all',
        this.handleTopicMessageAll.bind(this),
      );

      this.logger.log('✅ 所有测试消费者启动完成');
    } catch (error) {
      this.logger.error('❌ 启动测试消费者失败:', error.message);
    }
  }

  /**
   * 处理工作队列消息
   */
  private async handleWorkMessage(message: Message<any>): Promise<void> {
    this.logger.log(`🔨 [工作队列] 处理消息: ${message.id}`);
    this.logger.log(`📄 消息内容:`, message.data);

    // 模拟处理时间
    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.logger.log(`✅ [工作队列] 消息处理完成: ${message.id}`);
  }

  /**
   * 处理延迟队列消息
   */
  private async handleDelayMessage(message: Message<any>): Promise<void> {
    this.logger.log(`⏰ [延迟队列] 处理延迟消息: ${message.id}`);
    this.logger.log(`📄 消息内容:`, message.data);
    this.logger.log(
      `⏱️ 消息创建时间: ${new Date(message.timestamp).toLocaleString()}`,
    );
    this.logger.log(`⏱️ 当前处理时间: ${new Date().toLocaleString()}`);

    this.logger.log(`✅ [延迟队列] 消息处理完成: ${message.id}`);
  }

  /**
   * 处理优先级队列消息
   */
  private async handlePriorityMessage(message: Message<any>): Promise<void> {
    this.logger.log(
      `🔥 [优先级队列] 处理消息: ${message.id}, 优先级: ${message.priority || '未设置'}`,
    );
    this.logger.log(`📄 消息内容:`, message.data);

    this.logger.log(`✅ [优先级队列] 消息处理完成: ${message.id}`);
  }

  /**
   * 处理广播队列1消息
   */
  private async handleFanoutMessage1(message: Message<any>): Promise<void> {
    this.logger.log(`📢 [广播队列1] 收到广播消息: ${message.id}`);
    this.logger.log(`📄 消息内容:`, message.data);

    this.logger.log(`✅ [广播队列1] 消息处理完成: ${message.id}`);
  }

  /**
   * 处理广播队列2消息
   */
  private async handleFanoutMessage2(message: Message<any>): Promise<void> {
    this.logger.log(`📢 [广播队列2] 收到广播消息: ${message.id}`);
    this.logger.log(`📄 消息内容:`, message.data);

    this.logger.log(`✅ [广播队列2] 消息处理完成: ${message.id}`);
  }

  /**
   * 处理主题队列1消息 (test.*)
   */
  private async handleTopicMessage1(message: Message<any>): Promise<void> {
    this.logger.log(`🎯 [主题队列1] 收到主题消息 (test.*): ${message.id}`);
    this.logger.log(`📄 消息内容:`, message.data);

    this.logger.log(`✅ [主题队列1] 消息处理完成: ${message.id}`);
  }

  /**
   * 处理主题队列2消息 (*.important)
   */
  private async handleTopicMessage2(message: Message<any>): Promise<void> {
    this.logger.log(`🎯 [主题队列2] 收到重要消息 (*.important): ${message.id}`);
    this.logger.log(`📄 消息内容:`, message.data);

    this.logger.log(`✅ [主题队列2] 消息处理完成: ${message.id}`);
  }

  /**
   * 处理主题队列全部消息 (#)
   */
  private async handleTopicMessageAll(message: Message<any>): Promise<void> {
    this.logger.log(`🎯 [主题队列全部] 收到所有主题消息 (#): ${message.id}`);
    this.logger.log(`📄 消息内容:`, message.data);

    this.logger.log(`✅ [主题队列全部] 消息处理完成: ${message.id}`);
  }
}
