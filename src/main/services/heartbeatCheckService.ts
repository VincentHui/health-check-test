import { Logger } from "@ubio/framework";
import { dep } from "mesh-ioc";
import { RedisRepo } from "../repositories/redisRepo.js";

export class HeartbeatCheckService {
  @dep() logger!: Logger;
  @dep() db!: RedisRepo;
  loopState: "Looping life check" | "Stopping life check" =
    "Looping life check";
  checkPromise!: Promise<void>;

  async poll(age: number, delay: number = 1000) {
    while (this.loopState === "Looping life check") {
      const expired = await this.db.CheckForExpiredInstances(age);
      if (expired.length > 0) this.logger.info("removing expired..");
      await Promise.all(expired.map((app) => this.db.Remove(app)));
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    this.logger.info("stopping polling");
  }

  StartPolling(Age: number) {
    this.logger.info("starting polling");
    this.checkPromise = this.poll(Age);
  }

  async StopPolling() {
    this.loopState = "Stopping life check";
    await this.checkPromise;
  }
}
