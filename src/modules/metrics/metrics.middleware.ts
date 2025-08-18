import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const deltaNs = Number(process.hrtime.bigint() - start);
      const sec = deltaNs / 1e9;
      const route = (req.route?.path as string) || req.path || 'unknown';
      const labels = {
        method: req.method,
        route,
        status_code: String(res.statusCode),
      };
      this.metrics.httpRequestsTotal.inc(labels, 1);
      this.metrics.httpRequestDuration.observe(labels, sec);
    });
    next();
  }
}
