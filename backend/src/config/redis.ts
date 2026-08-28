import Redis from "ioredis";
import { env } from "./env";

/**
 * Shared Redis client for application-level operations
 * (rate limiting, inter-email delay gate, etc.).
 *
 * BullMQ creates its own internal connections — do NOT
 * share this instance with BullMQ queues/workers.
 */
export const redis = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null, // required by BullMQ when reusing config
});

/**
 * Returns a Redis connection config object for BullMQ
 * queues and workers (they need their own connections).
 */
export const bullMqConnection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
};
