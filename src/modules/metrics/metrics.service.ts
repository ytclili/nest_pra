import { Injectable,  OnModuleInit } from "@nestjs/common"
import client, {  Counter,  Histogram, Registry } from "prom-client"

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry = new Registry()
  readonly httpRequestsTotal: Counter<string>
  readonly httpRequestDuration: Histogram<string>

  constructor() {
    this.httpRequestsTotal = new client.Counter({
      name: "http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status_code"],
      registers: [this.registry],
    })

    this.httpRequestDuration = new client.Histogram({
      name: "http_request_duration_seconds",
      help: "Duration of HTTP requests in seconds",
      labelNames: ["method", "route", "status_code"],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    })
  }

  async onModuleInit() {
    client.collectDefaultMetrics({ register: this.registry })
  }

  getRegistry(): Registry {
    return this.registry
  }
}
