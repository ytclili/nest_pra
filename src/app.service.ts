import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RabbitMQEasyService } from './modules/rabbitmq/services/rabbitmq-easy.service';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService,private readonly rabbitMQEasyService: RabbitMQEasyService) {}
  getHello(): string {
    this.rabbitMQEasyService.publishOrderEvent("create",{name: "test"})
    return `Hello ${this.configService.get('APP_NAME')}!`;
  }
}
