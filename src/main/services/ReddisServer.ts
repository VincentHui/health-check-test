import { Logger } from "@ubio/framework";
import { dep } from "mesh-ioc";
import { RedisMemoryServer } from "redis-memory-server";

export class RedisServer {
  private redisServer!: RedisMemoryServer;

  async Start() {
    this.redisServer = new RedisMemoryServer();
    const host = await this.redisServer.getHost();
    const port = await this.redisServer.getPort();
    return `redis://${host}:${port}`;
  }

  async Stop() {
    await this.redisServer.stop();
  }
}
