import { Controller, Delete, Get, Param, Post } from "@nestjs/common"
import  { RedisService } from "./redis.service"

@Controller("redis")
export class RedisController {
  constructor(private readonly redis: RedisService) {}

  @Get("ping")
  async ping() {
    const pong = await this.redis.ping()
    return { pong }
  }

  @Post("set")
  async set(body: { key: string; value: unknown; ttl?: number }) {
    const { key, value, ttl } = body
    const ok = await this.redis.set(key, value as any, ttl)
    return { ok, key }
  }

  @Get("get/:key")
  async get(@Param("key") key: string) {
    const value = await this.redis.get(key)
    return { key, value }
  }

  @Delete(":key")
  async del(@Param("key") key: string) {
    const count = await this.redis.del(key)
    return { key, deleted: count }
  }

  @Post("incr")
  async incr(body: { key: string; by?: number }) {
    const { key, by = 1 } = body
    const val = await this.redis.incrby(key, by)
    return { key, value: val }
  }

  @Post("decr")
  async decr(body: { key: string; by?: number }) {
    const { key, by = 1 } = body
    const val = await this.redis.decrby(key, by)
    return { key, value: val }
  }

  @Post("expire")
  async expire(body: { key: string; ttl: number }) {
    const { key, ttl } = body
    const res = await this.redis.expire(key, ttl)
    return { key, result: res }
  }

  @Get("ttl/:key")
  async ttl(@Param("key") key: string) {
    const t = await this.redis.ttl(key)
    return { key, ttl: t }
  }

  // Pub/Sub demo
  @Post("pub")
  async pub(body: { channel: string; message: unknown }) {
    const { channel, message } = body
    const count = await this.redis.publish(channel, message as any)
    return { channel, subscribers: count }
  }

  @Post("sub")
  async sub(body: { channel: string }) {
    const { channel } = body
    const unsubscribe = await this.redis.subscribe(channel, (msg) => {
      // eslint-disable-next-line no-console
      console.log(`[Redis][${channel}] ${msg}`)
    })
    // NOTE: 仅用于演示，实际可配合应用生命周期管理
    setTimeout(() => {
      unsubscribe().catch(() => {})
    }, 60_000) // 1 分钟后自动取消订阅
    return { channel, subscribed: true, autoUnsubscribeInSeconds: 60 }
  }
}
