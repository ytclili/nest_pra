import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { RabbitMQCoreService } from './rabbitmq-core.service';
import { BusinessConsumer } from '../consumers/business.consumer';
import { QUEUE_CONFIGS } from '../config/queue.config';

/**
 * RabbitMQ 初始化服务
 * 应用启动时一次性设置所有队列和绑定关系
 */
@Injectable()
export class RabbitMQInitService implements OnModuleInit {
  private readonly logger = new Logger(RabbitMQInitService.name);
  private initialized = false;

  constructor(
    private readonly coreService: RabbitMQCoreService,
    private readonly business: BusinessConsumer,
  ) {}

  async onModuleInit() {
    // 延迟3秒确保连接已建立
    setTimeout(async () => {
      await this.initializeQueues();
      this.logger.verbose('🚀 队列初始化完成开始消费所有队列...');
      await this.business.startAllConsumers();
    }, 3000);
  }

  /**
   * 初始化所有队列和绑定关系
   */
  async initializeQueues(): Promise<void> {
    if (this.initialized) {
      this.logger.log('队列已初始化，跳过');
      return;
    }

    this.logger.log('🚀 开始初始化队列和绑定关系...');

    try {
      // 按交换机分组处理
      const exchangeGroups = this.groupByExchange();

      for (const [exchangeName, configs] of Object.entries(exchangeGroups)) {
        await this.setupExchangeAndQueues(exchangeName, configs);
      }

      this.initialized = true;
      this.logger.log(
        `✅ 队列初始化完成！共设置 ${QUEUE_CONFIGS.length} 个队列`,
      );
    } catch (error) {
      this.logger.error('❌ 队列初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 手动初始化（用于API调用）
   */
  async manualInit(): Promise<{
    success: boolean;
    message: string;
    queues: number;
  }> {
    try {
      await this.initializeQueues();
      return {
        success: true,
        message: '队列初始化成功',
        queues: QUEUE_CONFIGS.length,
      };
    } catch (error) {
      return {
        success: false,
        message: `初始化失败: ${error.message}`,
        queues: 0,
      };
    }
  }

  /**
   * 按交换机分组配置
   */
  private groupByExchange(): Record<string, typeof QUEUE_CONFIGS> {
    return QUEUE_CONFIGS.reduce(
      (groups, config) => {
        if (!groups[config.exchange]) {
          groups[config.exchange] = [];
        }
        groups[config.exchange].push(config);
        return groups;
      },
      {} as Record<string, typeof QUEUE_CONFIGS>,
    );
  }

  /**
   * 设置交换机和相关队列
   */
  private async setupExchangeAndQueues(
    exchangeName: string,
    configs: typeof QUEUE_CONFIGS,
  ): Promise<void> {
    // 获取交换机类型（同一个交换机的所有队列类型应该相同）
    const exchangeType = configs[0].exchangeType;
    const exchangeOptions = configs[0].exchangeOptions;

    // 1. 创建交换机
    await this.coreService.assertExchange(exchangeName, {
      type: exchangeType,
      durable: exchangeOptions?.durable ?? true,
      autoDelete: exchangeOptions?.autoDelete ?? false,
      arguments: exchangeOptions?.arguments,
    });

    // 2. 创建队列并绑定
    for (const config of configs) {
      // 创建队列
      await this.coreService.assertQueue(config.queue, {
        durable: config.queueOptions?.durable ?? true,
        exclusive: config.queueOptions?.exclusive ?? false,
        autoDelete: config.queueOptions?.autoDelete ?? false,
        arguments: config.queueOptions?.arguments,
      });

      // 绑定队列到交换机
      const routingKey = config.routingKey || '';
      await this.coreService.bindQueue(config.queue, exchangeName, routingKey);

      this.logger.debug(`✓ ${config.queue} -> ${exchangeName} (${routingKey})`);
    }

    this.logger.log(
      `✅ 交换机 ${exchangeName} 设置完成: ${configs.length} 个队列`,
    );
  }

  /**
   * 检查是否已初始化
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 获取配置信息
   */
  getConfigs() {
    return {
      total: QUEUE_CONFIGS.length,
      exchanges: Object.keys(this.groupByExchange()).length,
      queues: QUEUE_CONFIGS.map((c) => c.queue),
      initialized: this.initialized,
    };
  }
}
