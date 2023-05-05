import { RedisClientType, createClient } from "redis";
import { Instance } from "../schema/instance.js";
export const GetEarliestCreatedApp = (Apps: Instance[]) =>
  Apps.length >= 0 ? Apps.sort((a, b) => a.createdAt - b.createdAt)[0] : null;
export const GetLatestUpdatedApp = (Apps: Instance[]) =>
  Apps.length >= 0 ? Apps.sort((app) => app.updatedAt)[0] : null;

export class RedisRepo {
  private client!: RedisClientType;
  // private redisServer!: RedisMemoryServer;

  constructor() {}

  async Connect(url: string) {
    this.client = createClient({
      url,
    });
    // this.client = createClient({
    //   url: `redis://user:password@redis-10224.c78.eu-west-1-2.ec2.cloud.redislabs.com:10224`,
    // });
    this.client.on("error", () => {});
    this.client.on("connect", () => console.log("client is connected"));
    this.client.on("ready", () => console.log("client is ready"));

    await this.client.connect();
  }

  async Exists(app: Instance) {
    const { hash } = Instance.transformForRedis(app);
    return await this.HashExists(hash);
  }

  async HashExists(hash: string) {
    return await this.client.exists(hash);
  }

  async Remove(app: Instance) {
    const { hash, group } = Instance.transformForRedis(app);
    return await this.RemoveByHash(hash, group);
  }
  async RemoveByHash(hash: string, group: string) {
    await this.client.sRem(group, hash);
    return await this.client.del(hash);
  }
  private readonly groupsKey = "groups";

  async Save(app: Instance) {
    const { hash: appHash, fields, group } = Instance.transformForRedis(app);
    //relate many app hash to one group
    await this.client.sAdd(group, appHash);
    //relate many groups to one groupsKey
    await this.client.sAdd(this.groupsKey, group);
    await this.client.hSet(appHash, fields);
  }

  async GetAllGroups() {
    const members = await this.client.sMembers(this.groupsKey);
    return members;
  }

  async GetAllInstances() {
    const groups = await this.client.sMembers(this.groupsKey);
    const instances = await Promise.all(
      groups.map(async (group) => await this.GetInstancesInGroup(group))
    );
    return instances.reduce((prev, curr) => {
      return [...prev, ...curr];
    }, []);
  }

  async GetAllInstancesInAllGroups() {
    const groups = await this.client.sMembers(this.groupsKey);
    const groupsDetailed = await Promise.all(
      groups.map(async (group) => {
        const instancesInGroup = await this.GetInstancesInGroup(group);
        if (instancesInGroup.length <= 0) {
          return {
            group,
            instances: 0,
          };
        }
        const latestUpdated = GetLatestUpdatedApp(instancesInGroup)!.updatedAt;
        const earliestCreated =
          GetEarliestCreatedApp(instancesInGroup)!.createdAt;
        return {
          group,
          instances: instancesInGroup.length,
          latestUpdated,
          earliestCreated,
        };
      })
    );
    return groupsDetailed.filter((g) => g.instances >= 1);
  }

  async GetInstancesInGroup(group: string) {
    const members = await this.client.sMembers(group);
    return Promise.all(members.map(async (hash) => await this.GetByHash(hash)));
  }

  async GetByHash(hash: string) {
    const all = await this.client.hGetAll(hash);
    return new Promise<Instance>((res, rej) => {
      //need more validation logic
      const valid =
        Object.keys(all).length ===
        Object.keys(Instance.Schema.properties).length;
      if (!valid) rej(new Error("notFound"));
      res(Instance.transformFromRedis(all));
    });
  }

  async Get(app: Instance) {
    const { hash } = Instance.transformForRedis(app);
    return await this.GetByHash(hash);
  }

  async Close() {
    await this.client.quit();
    // await this.redisServer.stop();
    console.log("disconnect");
  }

  async CheckForExpiredInstances(expiryAge: number) {
    const instances = await this.GetAllInstances();
    const now = Date.now();
    return instances.filter((i) => now - i.updatedAt > expiryAge);
  }
}
