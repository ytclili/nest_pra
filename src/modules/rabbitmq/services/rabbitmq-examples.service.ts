import { Injectable, Logger } from '@nestjs/common';
import { RabbitMQEasyService } from '../services/rabbitmq-easy.service';
import { RabbitMQCoreService } from '../services/rabbitmq-core.service';

/**
 * 示例用法服务
 * - 优先级队列示例：根据 level 设置不同的 AMQP priority
 * - 广播队列示例：fanout 广播 + 多个队列消费
 * - 工作队列示例：预取 1，公平分发
 */
@Injectable()
export class RabbitMQExamplesService {
  private readonly logger = new Logger(RabbitMQExamplesService.name);

  constructor(
    private readonly easy: RabbitMQEasyService,
    private readonly core: RabbitMQCoreService,
  ) {}

  // ==================== 优先级队列（direct + x-max-priority） ====================

  /**
   * 发送优先级任务
   * 映射规则：
   * - low: 1
   * - normal: 5
   * - high: 8
   * - critical: 10
   */
  async sendPriorityTasks(
    tasks: Array<{
      id: string;
      payload?: any;
      level: 'low' | 'normal' | 'high' | 'critical';
    }>,
  ) {
    const level2Priority = (level: 'low' | 'normal' | 'high' | 'critical') => {
      switch (level) {
        case 'low':
          return 1;
        case 'normal':
          return 5;
        case 'high':
          return 8;
        case 'critical':
          return 10;
      }
    };

    const publishPromises = tasks.map((t) => {
      const priority = level2Priority(t.level);
      // 使用 priority-exchange + routingKey: urgent
      // urgent-tasks 队列已在配置中开启 x-max-priority: 10
      return this.core.publish(
        'priority-exchange',
        'urgent',
        { id: t.id, level: t.level, payload: t.payload, ts: Date.now() },
        { priority },
      );
    });

    const results = await Promise.all(publishPromises);
    const success = results.every(Boolean);
    return { success, sent: results.length };
  }

  /**
   * 启动优先级队列消费者
   * - workerCount: 并发工作者数量
   * - prefetch: 每个工作者一次只取 N 条（建议 1，保证公平性和可见优先级）
   */
  async startPriorityConsumers(opts?: {
    workerCount?: number;
    prefetch?: number;
  }) {
    const workerCount = Math.max(1, opts?.workerCount ?? 1);
    const prefetch = Math.max(1, opts?.prefetch ?? 1);

    this.logger.log(
      `启动优先级队列消费者：workers=${workerCount}, prefetch=${prefetch}`,
    );

    await this.easy.startMultipleWorkers(
      'urgent-tasks',
      async (msg: { id: string; level: string; payload?: any; ts: number }) => {
        // 模拟处理：高优先级更快，低优先级更慢
        const base =
          msg.level === 'critical'
            ? 100
            : msg.level === 'high'
              ? 200
              : msg.level === 'normal'
                ? 400
                : 600;
        await new Promise((r) => setTimeout(r, base + Math.random() * 200));
        this.logger.log(`已处理优先级任务：id=${msg.id}, level=${msg.level}`);
        // 成功则返回（上层会 ack）
      },
      workerCount,
      { prefetch },
    );

    return { success: true, message: '优先级队列消费者已启动' };
  }

  // ==================== 广播队列（fanout） ====================

  /**
   * 广播系统通知（fanout）
   * 通知会被广播到 notifications.web / notifications.mobile / notifications.email
   */
  async broadcast(notification: {
    type: 'maintenance' | 'update' | 'alert' | 'info';
    title: string;
    message: string;
    data?: any;
  }) {
    const ok = await this.easy.broadcastNotification(notification);
    return { success: ok };
  }

  /**
   * 启动 fanout 的三个队列消费者
   * - 可以按需只启动某些队列
   */
  async startFanoutConsumers(opts?: {
    web?: boolean;
    mobile?: boolean;
    email?: boolean;
    prefetch?: number;
  }) {
    const prefetch = Math.max(1, opts?.prefetch ?? 1);
    const toStart = {
      web: opts?.web ?? true,
      mobile: opts?.mobile ?? true,
      email: opts?.email ?? true,
    };

    this.logger.log(
      `启动 Fanout 消费者：web=${toStart.web}, mobile=${toStart.mobile}, email=${toStart.email}, prefetch=${prefetch}`,
    );

    const promises: Promise<void>[] = [];

    if (toStart.web) {
      promises.push(
        this.easy.consumeQueue(
          'notifications.web',
          async (n: any) => {
            // 模拟处理
            await new Promise((r) => setTimeout(r, 150));
            this.logger.log(`Web 通知: [${n.type}] ${n.title} - ${n.message}`);
          },
          { prefetch },
        ),
      );
    }

    if (toStart.mobile) {
      promises.push(
        this.easy.consumeQueue(
          'notifications.mobile',
          async (n: any) => {
            await new Promise((r) => setTimeout(r, 120));
            this.logger.log(
              `Mobile 通知: [${n.type}] ${n.title} - ${n.message}`,
            );
          },
          { prefetch },
        ),
      );
    }

    if (toStart.email) {
      promises.push(
        this.easy.consumeQueue(
          'notifications.email',
          async (n: any) => {
            await new Promise((r) => setTimeout(r, 180));
            this.logger.log(
              `Email 通知: [${n.type}] ${n.title} - ${n.message}`,
            );
          },
          { prefetch },
        ),
      );
    }

    await Promise.all(promises);
    return { success: true, message: 'Fanout 消费者已启动' };
  }

  // ==================== 工作队列（Work Queue，公平分发） ====================

  /**
   * 批量入队工作任务（这里用 email-tasks 做示例）
   */
  async enqueueWork(
    count: number,
    template?: { subject?: string; content?: string },
  ) {
    const jobs = Array.from({ length: count }).map((_, i) =>
      this.easy.sendEmail({
        to: `user${i + 1}@example.com`,
        subject: template?.subject ?? `Welcome #${i + 1}`,
        content:
          template?.content ??
          `Hello user${i + 1}, this is a work-queue demo message.`,
      }),
    );
    const results = await Promise.all(jobs);
    const ok = results.filter(Boolean).length;
    return { success: true, enqueued: ok };
  }

  /**
   * 启动工作队列消费者（email-tasks）
   * - workerCount：并发消费者数
   * - prefetch：每个消费者一次最多取 N 条，公平分发建议 1
   */
  async startWorkConsumers(opts?: { workerCount?: number; prefetch?: number }) {
    const workerCount = Math.max(1, opts?.workerCount ?? 2);
    const prefetch = Math.max(1, opts?.prefetch ?? 1);

    this.logger.log(
      `启动工作队列消费者：workers=${workerCount}, prefetch=${prefetch}`,
    );

    await this.easy.startMultipleWorkers(
      'email-tasks',
      async (email: any) => {
        // 模拟不同耗时的工作，观察公平分发
        await new Promise((r) => setTimeout(r, 500 + Math.random() * 1500));
        this.logger.log(`完成邮件任务: ${email.to}`);
      },
      workerCount,
      { prefetch },
    );

    return { success: true, message: '工作队列消费者已启动' };
  }
}
