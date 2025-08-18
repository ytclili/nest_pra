/**
 * RabbitMQ 相关接口定义
 */

/**
 * 消息接口
 */
export interface Message<T = any> {
  id: string;
  data: T;
  timestamp: number;
  retryCount?: number;
  delay?: number;
  priority?: number;
  headers?: Record<string, any>;
}

/**
 * 队列配置接口
 */
export interface QueueOptions {
  durable?: boolean;
  exclusive?: boolean;
  autoDelete?: boolean;
  arguments?: Record<string, any>;
}

/**
 * 交换机配置接口
 */
export interface ExchangeOptions {
  type: 'direct' | 'topic' | 'fanout' | 'headers';
  durable?: boolean;
  autoDelete?: boolean;
  arguments?: Record<string, any>;
}

/**
 * 消费者配置接口
 */
export interface ConsumerOptions {
  noAck?: boolean;
  exclusive?: boolean;
  priority?: number;
  arguments?: Record<string, any>;
}

/**
 * 发布配置接口
 */
export interface PublishOptions {
  persistent?: boolean;
  priority?: number;
  expiration?: string;
  headers?: Record<string, any>;
  delay?: number;
}

/**
 * 延迟队列配置接口
 */
export interface DelayQueueOptions extends QueueOptions {
  delayExchange?: string;
  maxDelay?: number;
}

/**
 * 死信队列配置接口
 */
export interface DeadLetterQueueOptions extends QueueOptions {
  deadLetterExchange?: string;
  deadLetterRoutingKey?: string;
  messageTtl?: number;
  maxRetries?: number;
}

/**
 * 消息处理器接口
 */
export type MessageHandler<T = any> = (
  message: Message<T>,
) => Promise<void> | void;

/**
 * 队列统计信息接口
 */
export interface QueueStats {
  name: string;
  messages: number;
  consumers: number;
  messageRate: number;
  deliverRate: number;
}
