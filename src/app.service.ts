import { Injectable } from '@nestjs/common';
import { RabbitMQEasyService } from './modules/rabbitmq/services/rabbitmq-easy.service';

@Injectable()
export class AppService {
  constructor(private readonly rabbitMQEasyService: RabbitMQEasyService){}
  getHello(): string {
    this.rabbitMQEasyService.publishOrderEvent("create",{name: "test"})
    return 'Hello World!';
  }
}
