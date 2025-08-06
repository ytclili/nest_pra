/**
 * RabbitMQ 队列配置文件
 * 在这里定义所有的队列、交换机和绑定关系
 */

export interface QueueConfig {
    // 队列名称
    queue: string
    // 交换机名称
    exchange: string
    // 交换机类型
    exchangeType: 'direct' | 'topic' | 'fanout'
    // 路由键（topic和direct需要，fanout忽略）
    routingKey?: string
    // 队列选项
    queueOptions?: {
      durable?: boolean
      exclusive?: boolean
      autoDelete?: boolean
      arguments?: Record<string, any>
    }
    // 交换机选项
    exchangeOptions?: {
      durable?: boolean
      autoDelete?: boolean
      arguments?: Record<string, any>
    }
  }
  
  /**
   * 所有队列配置
   */
  export const QUEUE_CONFIGS: QueueConfig[] = [
    // ==================== 工作队列 ====================
    {
      queue: 'email-tasks',
      exchange: 'work-exchange',
      exchangeType: 'direct',
      routingKey: 'email'
    },
    {
      queue: 'sms-tasks',
      exchange: 'work-exchange', 
      exchangeType: 'direct',
      routingKey: 'sms'
    },
    {
      queue: 'image-processing',
      exchange: 'work-exchange',
      exchangeType: 'direct', 
      routingKey: 'image'
    },
  
    // ==================== 事件队列 ====================
    {
      queue: 'events.user',
      exchange: 'events-exchange',
      exchangeType: 'topic',
      routingKey: 'user.*'
    },
    {
      queue: 'events.order',
      exchange: 'events-exchange',
      exchangeType: 'topic',
      routingKey: 'order.*'
    },
    {
      queue: 'events.payment',
      exchange: 'events-exchange', 
      exchangeType: 'topic',
      routingKey: 'payment.*'
    },
    {
      queue: 'events.all',
      exchange: 'events-exchange',
      exchangeType: 'topic',
      routingKey: '#'
    },
  
    // ==================== 日志队列 ====================
    {
      queue: 'logs.error',
      exchange: 'logs-exchange',
      exchangeType: 'topic',
      routingKey: '*.error'
    },
    {
      queue: 'logs.warning',
      exchange: 'logs-exchange',
      exchangeType: 'topic', 
      routingKey: '*.warning'
    },
    {
      queue: 'logs.all',
      exchange: 'logs-exchange',
      exchangeType: 'topic',
      routingKey: '#'
    },
  
    // ==================== 通知队列 ====================
    {
      queue: 'notifications.web',
      exchange: 'notifications-exchange',
      exchangeType: 'fanout'
    },
    {
      queue: 'notifications.mobile',
      exchange: 'notifications-exchange',
      exchangeType: 'fanout'
    },
    {
      queue: 'notifications.email',
      exchange: 'notifications-exchange', 
      exchangeType: 'fanout'
    },
  
    // ==================== 优先级队列 ====================
    {
      queue: 'urgent-tasks',
      exchange: 'priority-exchange',
      exchangeType: 'direct',
      routingKey: 'urgent',
      queueOptions: {
        arguments: {
          'x-max-priority': 10
        }
      }
    }
  ]
  
  /**
   * 队列映射 - 方便查找队列配置
   */
  export const QUEUE_MAP = QUEUE_CONFIGS.reduce((map, config) => {
    map[config.queue] = config
    return map
  }, {} as Record<string, QueueConfig>)
  
  /**
   * 交换机映射 - 方便查找交换机下的队列
   */
  export const EXCHANGE_MAP = QUEUE_CONFIGS.reduce((map, config) => {
    if (!map[config.exchange]) {
      map[config.exchange] = []
    }
    map[config.exchange].push(config)
    return map
  }, {} as Record<string, QueueConfig[]>)
  