import { redis, env, logger } from "../config";

/**
 * Inter-email delay gate — enforces a minimum time gap between
 * consecutive sends from the same sender.
 *
 * Uses an atomic Redis Lua script to check the last sent timestamp
 * and update it atomically. This prevents race conditions under high
 * concurrency when multiple workers are processing emails for the same sender.
 */

/**
 * Check the inter-email delay gate for a sender.
 *
 * @returns `null` if the sender can proceed, otherwise the number of
 *          milliseconds the job should be delayed before retrying.
 */
export async function checkInterEmailDelay(
  senderId: string
): Promise<number | null> {
  const lockKey = `last-sent:${senderId}`;
  const delayMs = env.EMAIL_DELAY_MS;
  const now = Date.now();

  // Atomic check-and-set via Redis Lua script
  const luaScript = `
    local lastSent = redis.call('get', KEYS[1])
    if lastSent then
      local elapsed = tonumber(ARGV[1]) - tonumber(lastSent)
      local delayMs = tonumber(ARGV[2])
      if elapsed < delayMs then
        return delayMs - elapsed
      end
    end
    redis.call('set', KEYS[1], ARGV[1], 'PX', ARGV[2])
    return 0
  `;

  try {
    const result = await redis.eval(
      luaScript,
      1,
      lockKey,
      String(now),
      String(delayMs)
    ) as number;

    if (result > 0) {
      logger.debug("Inter-email delay gate hit", { senderId, waitFor: result });
      return result;
    }
  } catch (err) {
    logger.error("Redis Lua evaluation failed for inter-email delay", {
      senderId,
      error: (err as Error).message,
    });
    // Fallback: unsafe check if Redis eval fails
    const lastSent = await redis.get(lockKey);
    if (lastSent) {
      const elapsed = now - Number(lastSent);
      if (elapsed < delayMs) {
        return delayMs - elapsed;
      }
    }
    await redis.set(lockKey, String(now), "PX", delayMs);
  }

  return null;
}
