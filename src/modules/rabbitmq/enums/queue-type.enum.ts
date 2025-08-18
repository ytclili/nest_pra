/**
 * 队列类型枚举
 */
export enum QueueType {
  /**
   * 直连队列 - 精确匹配路由键
   */
  DIRECT = 'direct',

  /**
   * 主题队列 - 支持通配符匹配路由键
   */
  TOPIC = 'topic',

  /**
   * 广播队列 - 广播消息到所有绑定的队列
   */
  FANOUT = 'fanout',

  /**
   * 延迟队列 - 延迟投递消息
   */
  DELAY = 'delay',

  /**
   * 死信队列 - 处理失败的消息
   */
  DEAD_LETTER = 'dead_letter',

  /**
   * 优先级队列 - 支持消息优先级
   */
  PRIORITY = 'priority',

  /**
   * 工作队列 - 负载均衡分发消息
   */
  WORK = 'work',
}

/**
 * 消息状态枚举
 */
export enum MessageStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DEAD_LETTER = 'dead_letter',
}
