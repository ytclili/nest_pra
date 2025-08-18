import { SetMetadata } from '@nestjs/common';
import { QueueType } from '../enums/queue-type.enum';

/**
 * 队列消费者元数据键
 */
export const QUEUE_CONSUMER_METADATA = 'queue:consumer';

/**
 * 队列消费者装饰器配置
 */
export interface QueueConsumerOptions {
  queue: string;
  type: QueueType;
  exchange?: string;
  routingKey?: string;
  routingPattern?: string;
  maxRetries?: number;
  priority?: number;
}

/**
 * 队列消费者装饰器
 * 用于标记方法为队列消费者
 */
export const QueueConsumer = (options: QueueConsumerOptions) =>
  SetMetadata(QUEUE_CONSUMER_METADATA, options);

/**
 * 延迟队列消费者装饰器
 */
export const DelayQueueConsumer = (queue: string, maxRetries?: number) =>
  QueueConsumer({
    queue,
    type: QueueType.DELAY,
    maxRetries,
  });

/**
 * 广播队列消费者装饰器
 */
export const FanoutQueueConsumer = (queue: string, exchange: string) =>
  QueueConsumer({
    queue,
    type: QueueType.FANOUT,
    exchange,
  });

/**
 * 主题队列消费者装饰器
 */
export const TopicQueueConsumer = (
  queue: string,
  exchange: string,
  routingPattern: string,
) =>
  QueueConsumer({
    queue,
    type: QueueType.TOPIC,
    exchange,
    routingPattern,
  });

/**
 * 工作队列消费者装饰器
 */
export const WorkQueueConsumer = (queue: string) =>
  QueueConsumer({
    queue,
    type: QueueType.WORK,
  });

/**
 * 优先级队列消费者装饰器
 */
export const PriorityQueueConsumer = (queue: string, priority?: number) =>
  QueueConsumer({
    queue,
    type: QueueType.PRIORITY,
    priority,
  });

/**
 * 死信队列消费者装饰器
 */
export const DeadLetterQueueConsumer = (originalQueue: string) =>
  QueueConsumer({
    queue: `dlq.${originalQueue}`,
    type: QueueType.DEAD_LETTER,
  });
