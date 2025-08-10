import { Global, Module, type DynamicModule } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import Redis from "ioredis"
import { REDIS_CLIENT, REDIS_OPTIONS, REDIS_SUBSCRIBER, type RedisModuleOptions } from "./redis.constants"
import { RedisService } from "./redis.service"
import { RedisController } from "./redis.controller"

@Global()
@Module({})
export class RedisModule {
  static forRoot(options?: Partial<RedisModuleOptions>): DynamicModule {
    return {
      module: RedisModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: REDIS_OPTIONS,
          inject: [ConfigService],
          useFactory: (config: ConfigService) => {
            const merged: RedisModuleOptions = {
              url: config.get<string>("REDIS_URL"),
              host: config.get<string>("REDIS_HOST", "127.0.0.1"),
              port: Number(config.get<string>("REDIS_PORT", "6379")),
              password: config.get<string>("REDIS_PASSWORD"),
              db: Number(config.get<string>("REDIS_DB", "0")),
              tls: config.get<string>("REDIS_TLS", "false") === "true",
              keyPrefix: config.get<string>("REDIS_KEY_PREFIX", "app:"),
              ...(options || {}),
            }
            return merged
          },
        },
        {
          provide: REDIS_CLIENT,
          inject: [REDIS_OPTIONS],
          useFactory: (opts: RedisModuleOptions) => {
            const client =
              opts.url != null && opts.url.length > 0
                ? new Redis(opts.url)
                : new Redis({
                    host: opts.host,
                    port: opts.port,
                    password: opts.password,
                    db: opts.db,
                    tls: opts.tls ? {} : undefined,
                    keyPrefix: opts.keyPrefix,
                  })
            client.on("error", (err) => console.error("[Redis] error", err?.message))
            return client
          },
        },
        {
          provide: REDIS_SUBSCRIBER,
          inject: [REDIS_OPTIONS],
          useFactory: (opts: RedisModuleOptions) => {
            const sub =
              opts.url != null && opts.url.length > 0
                ? new Redis(opts.url)
                : new Redis({
                    host: opts.host,
                    port: opts.port,
                    password: opts.password,
                    db: opts.db,
                    tls: opts.tls ? {} : undefined,
                    keyPrefix: opts.keyPrefix,
                  })
            sub.on("error", (err) => console.error("[Redis:sub] error", err?.message))
            return sub
          },
        },
        RedisService,
      ],
      exports: [REDIS_CLIENT, REDIS_SUBSCRIBER, RedisService],
      controllers: [RedisController],
    }
  }
}
