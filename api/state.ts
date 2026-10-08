import { createStateHandler } from "../server/stateHandler.ts";

const handler = createStateHandler({
  redisUrl: process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL,
  redisToken: process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN,
  adminPin: process.env.ADMIN_PIN,
});

export default { fetch: (request: Request) => handler(request) };
