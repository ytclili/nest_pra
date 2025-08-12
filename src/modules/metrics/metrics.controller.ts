import { Controller, Get, Header } from "@nestjs/common"
import { ApiExcludeEndpoint, ApiTags } from "@nestjs/swagger"
import  { MetricsService } from "./metrics.service"

@ApiTags("Metrics")
@Controller("metrics")
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @ApiExcludeEndpoint()
  @Header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
  async getMetrics() {
    return this.metrics.getRegistry().metrics()
  }
}
