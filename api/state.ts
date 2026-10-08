import { createStateHandler } from "../server/stateHandler.js";

const handler = createStateHandler({
  redisUrl: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL,
  redisToken: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN,
  adminUsername: process.env.ADMIN_USERNAME,
  adminPassword: process.env.ADMIN_PASSWORD,
});

export default { fetch: (request: Request) => handler(request) };
