import { Application } from "@ubio/framework";
import { AppGroupRouter } from "./routes/AppGroupRouter.js";
import { LifeTimeCheckService } from "./services/LifeTimeCheckService.js";
import { dep } from "mesh-ioc";
import { RedisRepo } from "./repositories/RedisRepo.js";
import dotenv from "dotenv";
import { RedisServer } from "./services/ReddisServer.js";
dotenv.config();

export class App extends Application {
  @dep() reddis!: RedisRepo;
  @dep() redisServer!: RedisServer;
  @dep() checker!: LifeTimeCheckService;
  override createHttpRequestScope() {
    const mesh = super.createHttpRequestScope();
    mesh.service(AppGroupRouter);
    return mesh;
  }
  override createGlobalScope() {
    const mesh = super.createGlobalScope();
    mesh.service(LifeTimeCheckService);
    mesh.service(RedisRepo);
    mesh.service(RedisServer);
    return mesh;
  }

  override async beforeStart() {
    await this.httpServer.startServer();
    const url = await this.redisServer.Start();
    await this.reddis.Connect(url);
    await this.checker.StartPolling(
      Number.parseInt(process.env.MAX_HEARTBEAT_AGE!)
    );
  }

  override async afterStop() {
    await this.checker.StopPolling();
    await this.httpServer.stopServer();
    await this.reddis.Close();
    await this.redisServer.Stop();
  }
}
