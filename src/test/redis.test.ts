import { RedisRepo } from "../main/repositories/redisRepo.js";
import { RedisService } from "../main/services/reddisService.js";

let repo: RedisRepo = new RedisRepo();
let redisServer: RedisService = new RedisService();

//https://stackoverflow.com/questions/105034/how-do-i-create-a-guid-uuid
function generateUUID() {
  // Public Domain/MIT
  var d = new Date().getTime(); //Timestamp
  var d2 =
    (typeof performance !== "undefined" &&
      performance.now &&
      performance.now() * 1000) ||
    0; //Time in microseconds since page-load or 0 if unsupported
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = Math.random() * 16; //random number between 0 and 16
    if (d > 0) {
      //Use timestamp until depleted
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      //Use microseconds since page-load if supported
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const RandomAppToCheck = () => ({
  id: generateUUID(),
  group: "particle-detector",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  meta: { test: "test" },
});

beforeAll(async () => {
  const url = await redisServer.Start();
  await repo.Connect(url);
});

afterAll(async () => {
  await repo.Close();
  await redisServer.Stop();
});

test("Set And Get AppToCheck", async () => {
  const appToCheckFixture = RandomAppToCheck();
  await repo.Save(appToCheckFixture);
  const fromRedis = await repo.Get(appToCheckFixture);
  expect(fromRedis).toEqual(appToCheckFixture);
});

test("Set And Check AppToCheck Exists", async () => {
  const appToCheckFixture = RandomAppToCheck();
  await repo.Save(appToCheckFixture);
  const result = await repo.Exists(appToCheckFixture);
  expect(result).toEqual(1);
});

test("Delete AppToCheck", async () => {
  const appToCheckFixture = RandomAppToCheck();
  await repo.Save(appToCheckFixture);
  const result = await repo.Exists(appToCheckFixture);
  expect(result).toEqual(1);
  await repo.Remove(appToCheckFixture);
  const result2 = await repo.Exists(appToCheckFixture);
  expect(result2).toEqual(0);
  try {
    await repo.Get(appToCheckFixture);
  } catch (e) {
    expect(e).toEqual(new Error("notFound"));
  }
});

test("Get Group", async () => {
  const appToCheckFixture1 = RandomAppToCheck();
  appToCheckFixture1.group = "test-group";
  await repo.Save(appToCheckFixture1);
  const appToCheckFixture2 = RandomAppToCheck();
  appToCheckFixture2.group = "test-group";
  await repo.Save(appToCheckFixture2);

  try {
    const result2 = await repo.GetInstancesInGroup("test-group");
    expect(result2).toEqual(
      expect.arrayContaining([appToCheckFixture1, appToCheckFixture2])
    );
  } catch (e) {
    console.log({ e });
  }
});

test("Get All Groups", async () => {
  const latestUpdated = Date.now() + 3000;
  const earliestCreated = Date.now() - 5000;

  const appToCheckFixture1 = RandomAppToCheck();
  appToCheckFixture1.group = "test-group-4";
  appToCheckFixture1.updatedAt = latestUpdated;
  appToCheckFixture1.createdAt = earliestCreated;
  await repo.Save(appToCheckFixture1);

  const appToCheckFixture2 = RandomAppToCheck();
  appToCheckFixture2.group = "test-group-10";
  appToCheckFixture2.updatedAt = 0;
  appToCheckFixture2.createdAt = -1;
  await repo.Save(appToCheckFixture2);

  const appToCheckFixture3 = RandomAppToCheck();
  appToCheckFixture3.group = "test-group-10";
  appToCheckFixture3.updatedAt = 0;
  appToCheckFixture3.createdAt = -1;
  await repo.Save(appToCheckFixture3);

  const groupsAndInstances = await repo.GetAllInstancesInAllGroups();

  expect(groupsAndInstances).toEqual(
    expect.arrayContaining([
      {
        group: "test-group-10",
        instances: 2,
        latestUpdated: 0,
        earliestCreated: -1,
      },
      {
        group: "test-group-4",
        instances: 1,
        latestUpdated: latestUpdated,
        earliestCreated: earliestCreated,
      },
    ])
  );
  expect(latestUpdated).toEqual(
    groupsAndInstances.filter((g) => g.group === "test-group-4")[0]
      .latestUpdated
  );
});

function timeout(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function GetAge(epochTime: number) {
  return Date.now() - epochTime;
}

test("check expired app", async () => {
  const appToCheckFixture = RandomAppToCheck();
  await timeout(2000);
  const age = GetAge(appToCheckFixture.createdAt);
  expect(age).toBeGreaterThanOrEqual(2000);
  await repo.Save(appToCheckFixture);
  const expired = await repo.CheckForExpiredInstances(1000);
  expect(expired).toEqual(expect.arrayContaining([appToCheckFixture]));
  const nothingExpired = await repo.CheckForExpiredInstances(20000);
  expect(nothingExpired).not.toContain(appToCheckFixture);
});
