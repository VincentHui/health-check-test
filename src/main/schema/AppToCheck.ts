//cannot use Ubio schema since it cannot use an object with the anyOf pattern properties for meta

export interface AppToCheck {
  id: string;
  group: string;
  createdAt: number;
  updatedAt: number;
  meta: object;
}

export const GetHash = ({ id, group }: { id: string; group: string }) =>
  `${id}:${group}`;

export const MakeHash = (a: string, b: string) => `${a}:${b}`;

export const AppToCheck = {
  Schema: {
    type: "object",
    properties: {
      id: { type: "string" },
      group: { type: "string" },
      createdAt: { type: "string" },
      updatedAt: { type: "string" },
      meta: { type: "object" },
    },
  },
  transformForRepo: ({
    id,
    group,
    createdAt,
    updatedAt,
    meta,
  }: AppToCheck) => ({
    id,
    group,
    createdAt,
    updatedAt,
    meta: JSON.stringify(meta),
  }),
  transformFromRedis: (fromRedis: { [x: string]: string }) => {
    return {
      ...fromRedis,
      createdAt: parseInt(fromRedis["createdAt"]),
      updatedAt: parseInt(fromRedis["updatedAt"]),
      meta: JSON.parse(fromRedis["meta"]),
    } as AppToCheck;
  },
  transformForRedis: ({
    id,
    group,
    createdAt,
    updatedAt,
    meta,
  }: AppToCheck) => ({
    hash: GetHash({ id, group }),
    id,
    group,
    fields: new Map([
      ["id", id],
      ["group", group],
      ["createdAt", createdAt.toString()],
      ["updatedAt", updatedAt.toString()],
      ["meta", JSON.stringify(meta)],
    ]),
  }),
  transformFromRepo: () => {},
};
