import { Application } from "@ubio/framework";
import { AppGroupRouter } from "./routes/appGroupRouter.js";
import { HeartbeatCheckService } from "./services/heartbeatCheckService.js";
import { dep } from "mesh-ioc";
import { RedisRepo } from "./repositories/redisRepo.js";
import dotenv from "dotenv";
import { RedisService } from "./services/reddisService.js";
dotenv.config();

export class App extends Application {
  @dep() repo!: RedisRepo;
  @dep() redisServer!: RedisService;
  @dep() checker!: HeartbeatCheckService;
  override createHttpRequestScope() {
    const mesh = super.createHttpRequestScope();
    mesh.service(AppGroupRouter);
    return mesh;
  }
  override createGlobalScope() {
    const mesh = super.createGlobalScope();
    mesh.service(HeartbeatCheckService);
    mesh.service(RedisRepo);
    mesh.service(RedisService);
    return mesh;
  }

  override async beforeStart() {
    await this.httpServer.startServer();
    const url = await this.redisServer.Start();
    await this.repo.Connect(url);
    await this.checker.StartPolling(
      Number.parseInt(process.env.MAX_HEARTBEAT_AGE!)
    );
  }

  override async afterStop() {
    await this.checker.StopPolling();
    await this.httpServer.stopServer();
    await this.repo.Close();
    await this.redisServer.Stop();
  }
}
