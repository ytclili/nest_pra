import { Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '../interfaces/rabbitmq.interface';

/**
 * 消息序列化服务
 * 负责消息的序列化和反序列化
 */
@Injectable()
export class MessageSerializerService {
  /**
   * 序列化消息
   */
  serialize<T>(
    data: T,
    options?: {
      delay?: number;
      priority?: number;
      headers?: Record<string, any>;
    },
  ): Buffer {
    const message: Message<T> = {
      id: uuidv4(),
      data,
      timestamp: Date.now(),
      retryCount: 0,
      delay: options?.delay,
      priority: options?.priority,
      headers: options?.headers,
    };

    return Buffer.from(JSON.stringify(message), 'utf-8');
  }

  /**
   * 反序列化消息
   */
  deserialize<T>(buffer: Buffer): Message<T> {
    try {
      const content = buffer.toString('utf-8');
      const message = JSON.parse(content) as Message<T>;

      // 验证消息格式
      if (!message.id || !message.data || !message.timestamp) {
        throw new Error('无效的消息格式');
      }

      return message;
    } catch (error) {
      throw new Error(`消息反序列化失败: ${error.message}`);
    }
  }

  /**
   * 创建重试消息
   */
  createRetryMessage<T>(
    originalMessage: Message<T>,
    maxRetries = 3,
  ): Message<T> {
    const retryCount = (originalMessage.retryCount || 0) + 1;

    if (retryCount > maxRetries) {
      throw new Error('超过最大重试次数');
    }

    return {
      ...originalMessage,
      id: uuidv4(), // 生成新的消息ID
      timestamp: Date.now(),
      retryCount,
      // 指数退避延迟
      delay: Math.pow(2, retryCount) * 1000,
    };
  }

  /**
   * 验证消息
   */
  validateMessage<T>(message: Message<T>): boolean {
    return !!(
      message &&
      message.id &&
      message.data !== undefined &&
      message.timestamp &&
      typeof message.timestamp === 'number'
    );
  }
}
