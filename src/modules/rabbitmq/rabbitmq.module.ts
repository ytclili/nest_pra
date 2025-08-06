import { Module, Global } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"

// 服务
import { RabbitMQConnectionService } from "./services/rabbitmq-connection.service"
import { MessageSerializerService } from "./services/message-serializer.service"
import { RabbitMQCoreService } from "./services/rabbitmq-core.service"
import { DelayQueueService } from "./services/delay-queue.service"
import { FanoutQueueService } from "./services/fanout-queue.service"
import { TopicQueueService } from "./services/topic-queue.service"
import { DeadLetterQueueService } from "./services/dead-letter-queue.service"
import { PriorityQueueService } from "./services/priority-queue.service"
import { WorkQueueService } from "./services/work-queue.service"
import { RabbitMQManagementService } from "./services/rabbitmq-management.service"
import { RabbitMQService } from "./services/rabbitmq.service"
import { RabbitMQInitService } from "./services/rabbitmq-init.service"
import { RabbitMQEasyService } from "./services/rabbitmq-easy.service"
import { BusinessConsumer } from "./consumers/business.consumer" 

// 控制器
import { RabbitMQController } from "./controllers/rabbitmq.controller"
import { RabbitMQConsumerController } from "./controllers/rabbitmq-consumer.controller"


/**
 * RabbitMQ 模块
 * 提供完整的消息队列功能
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    // 核心服务
    RabbitMQConnectionService,
    MessageSerializerService,
    RabbitMQCoreService,

    // 队列服务
    DelayQueueService,
    FanoutQueueService,
    TopicQueueService,
    DeadLetterQueueService,
    PriorityQueueService,
    WorkQueueService,

    // 管理服务
    RabbitMQManagementService,
   // 简化服务（推荐使用）
    RabbitMQInitService,
    RabbitMQEasyService,

    // 消费者
    BusinessConsumer, // 添加这一行
    // 统一服务
    RabbitMQService,
  ],
  controllers: [RabbitMQController,RabbitMQConsumerController],
  exports: [
    RabbitMQService,
    DelayQueueService,
    FanoutQueueService,
    TopicQueueService,
    DeadLetterQueueService,
    PriorityQueueService,
    WorkQueueService,
    RabbitMQManagementService,
    RabbitMQEasyService
  ],
})
export class RabbitMQModule {}
