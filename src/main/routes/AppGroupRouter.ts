import {
  Router,
  Get,
  PathParam,
  BodyParam,
  Post,
  Delete,
} from "@ubio/framework";
import { dep } from "mesh-ioc";
import { AppToCheck, GetHash } from "../schema/AppToCheck.js";
import { RedisRepo } from "../repositories/RedisRepo.js";

export class AppGroupRouter extends Router {
  @dep() repo!: RedisRepo;
  @Delete({
    path: "/{group}/{id}",
    responses: {
      200: {
        schema: {
          type: "object",
          properties: {
            message: { type: "string" },
          },
        },
      },
    },
  })
  async delete(
    @PathParam("id", { schema: { type: "string" } })
    id: string,
    @PathParam("group", { schema: { type: "string" } })
    group: string
  ) {
    const result = await this.repo.RemoveByHash(GetHash({ id, group }), group);
    const message = result
      ? `application with id:${id} has been deleted from group:${group}`
      : `application with id:${id} not at group:${group}`;
    return {
      message,
    };
  }

  @Post({
    path: "/{group}/{id}",
    responses: {
      200: {
        schema: AppToCheck.Schema,
      },
    },
  })
  async upsert(
    @PathParam("id", { schema: { type: "string" } })
    id: string,
    @PathParam("group", { schema: { type: "string" } })
    group: string,
    @BodyParam("meta", {
      schema: {
        type: "object",
      },
    })
    meta: object
  ): Promise<AppToCheck> {
    const hash = GetHash({ id, group });
    //add
    const result = await this.repo.HashExists(hash);
    if (result <= 0) {
      const toAdd = {
        id,
        group,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        meta,
      };
      await this.repo.Save(toAdd);
      return toAdd;
    }
    //update
    const saved = await this.repo.GetByHash(hash);
    const toAdd = {
      ...saved,
      updatedAt: Date.now(),
      meta,
    };
    await this.repo.Save(toAdd);
    return toAdd;
  }

  @Get({
    path: "/{group}",
    responses: {
      200: {
        schema: {
          type: "array",
          items: AppToCheck.Schema,
        },
      },
    },
  })
  async group(
    @PathParam("group", { schema: { type: "string" } })
    group: string
  ): Promise<AppToCheck[]> {
    return await this.repo.GetInstancesInGroup(group);
  }

  @Get({
    path: "/",
    responses: {
      200: {
        schema: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
    },
  })
  async getAllGroups(): Promise<{ group: string; instances: number }[]> {
    const groups = await this.repo.GetAllInstancesInAllGroups();
    return groups.map((group) => ({
      group: group.group,
      instances: group.instances,
    }));
  }
}
