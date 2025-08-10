import { Inject, Injectable, Logger, Optional } from "@nestjs/common"
import type { Cache } from "cache-manager"
import  Redis from "ioredis"
import { REDIS_CLIENT, REDIS_SUBSCRIBER } from "./redis.constants";

type JsonValue = string | number | boolean | null | Record<string, unknown> | Array<unknown>

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name)



  constructor(  
  @Inject(REDIS_CLIENT) private readonly client: Redis,
  @Inject(REDIS_SUBSCRIBER) private readonly subClient: Redis,
  @Optional() private readonly cache?: Cache
) {

  }

  // Basic
  async ping(): Promise<string> {
    return this.client.ping()
  }

  async get<T = string>(key: string): Promise<T | null> {
    const val = await this.client.get(key)
    if (val == null) return null
    try {
      return JSON.parse(val) as T
    } catch {
      return val as unknown as T
    }
  }

  async set(key: string, value: JsonValue, ttlSeconds?: number): Promise<"OK" | null> {
    const payload = typeof value === "string" ? value : JSON.stringify(value)
    if (ttlSeconds && ttlSeconds > 0) {
      return this.client.set(key, payload, "EX", ttlSeconds)
    }
    return this.client.set(key, payload)
  }

  async del(key: string): Promise<number> {
    return this.client.del(key)
  }

  async incrby(key: string, by = 1): Promise<number> {
    return this.client.incrby(key, by)
  }

  async decrby(key: string, by = 1): Promise<number> {
    return this.client.decrby(key, by)
  }

  async expire(key: string, ttlSeconds: number): Promise<number> {
    return this.client.expire(key, ttlSeconds)
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key)
  }

  // Cache-manager helpers (only if you later register CacheModule)
  async cacheGet<T = unknown>(key: string): Promise<T | undefined> {
    return this.cache?.get<T>(key)
  }

  async cacheSet<T = unknown>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.cache?.set(key, value as any, ttlSeconds ? ttlSeconds * 1000 : undefined)
  }

  async cacheDel(key: string): Promise<void> {
    await this.cache?.del(key)
  }

  // Pub/Sub
  async publish(channel: string, message: JsonValue): Promise<number> {
    const payload = typeof message === "string" ? message : JSON.stringify(message)
    return this.client.publish(channel, payload)
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<() => Promise<void>> {
    await this.subClient.subscribe(channel)
    const onMessage = (ch: string, msg: string) => {
      if (ch === channel) handler(msg)
    }
    this.subClient.on("message", onMessage)

    return async () => {
      try {
        this.subClient.off("message", onMessage)
        await this.subClient.unsubscribe(channel)
      } catch (e) {
        this.logger.warn(`Unsubscribe error for channel ${channel}: ${(e as Error).message}`)
      }
    }
  }
}
