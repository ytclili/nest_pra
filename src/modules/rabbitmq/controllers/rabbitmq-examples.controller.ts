import { Body, Controller, Post } from "@nestjs/common"
import { ApiOperation, ApiTags } from "@nestjs/swagger"
import { RabbitMQExamplesService } from "../services/rabbitmq-examples.service"

@ApiTags("RabbitMQ Examples")
@Controller("mq/examples")
export class RabbitMQExamplesController {
  constructor(private readonly examples: RabbitMQExamplesService) {}

  // ==================== 优先级队列 ====================

  @Post("priority/send")
  @ApiOperation({ summary: "发送优先级任务（low/normal/high/critical）" })
  async sendPriority(@Body() body: { tasks: Array<{ id: string; level: "low" | "normal" | "high" | "critical"; payload?: any }> }) {
    return this.examples.sendPriorityTasks(body.tasks)
  }

  @Post("priority/consume")
  @ApiOperation({ summary: "启动优先级队列消费者" })
  async consumePriority(@Body() body?: { workerCount?: number; prefetch?: number }) {
    return this.examples.startPriorityConsumers(body)
  }

  // ==================== 广播（fanout） ====================

  @Post("fanout/broadcast")
  @ApiOperation({ summary: "广播系统通知（fanout）" })
  async broadcast(@Body() body: { type: "maintenance" | "update" | "alert" | "info"; title: string; message: string; data?: any }) {
    return this.examples.broadcast(body)
  }

  @Post("fanout/consume")
  @ApiOperation({ summary: "启动 fanout 消费者（默认全启，可按需开关）" })
  async consumeFanout(@Body() body?: { web?: boolean; mobile?: boolean; email?: boolean; prefetch?: number }) {
    return this.examples.startFanoutConsumers(body)
  }

  // ==================== 工作队列（Work Queue） ====================

  @Post("work/enqueue")
  @ApiOperation({ summary: "入队工作任务（使用 email-tasks 演示）" })
  async enqueueWork(@Body() body: { count: number; template?: { subject?: string; content?: string } }) {
    return this.examples.enqueueWork(Math.max(0, body.count), body.template)
  }

  @Post("work/consume")
  @ApiOperation({ summary: "启动工作队列消费者（fair dispatch）" })
  async consumeWork(@Body() body?: { workerCount?: number; prefetch?: number }) {
    return this.examples.startWorkConsumers(body)
  }
}
