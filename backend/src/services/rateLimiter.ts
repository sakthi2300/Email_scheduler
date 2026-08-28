import { redis, logger } from "../config";

/**
 * Rate limiter using Redis atomic INCR + EXPIRE.
 *
 * Key format: `ratelimit:{senderId}:{hourWindow}`
 * where hourWindow is the ISO hour string (e.g., "2024-01-15T14").
 *
 * This is safe across multiple worker processes/instances because
 * INCR is atomic in Redis — no race conditions.
 */

/**
 * Returns the current hour window string (truncated to the hour).
 * Example: "2024-01-15T14"
 */
export function currentHourWindow(): string {
  const now = new Date();
  return now.toISOString().slice(0, 13); // "YYYY-MM-DDTHH"
}

/**
 * Returns milliseconds until the next hour boundary.
 */
export function msUntilNextHour(): number {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
  return nextHour.getTime() - now.getTime();
}

/**
 * Check and increment the rate limit counter for a sender.
 *
 * @returns Object with `allowed` (whether the send is within limits)
 *          and `count` (current count after increment).
 */
export async function checkRateLimit(
  senderId: string,
  hourlyLimit: number
): Promise<{ allowed: boolean; count: number }> {
  const hourWindow = currentHourWindow();
  const key = `ratelimit:${senderId}:${hourWindow}`;

  // Atomic increment — safe across concurrent workers
  const count = await redis.incr(key);

  // Set expiry only on the first increment (count === 1)
  if (count === 1) {
    await redis.expire(key, 3600);
  }

  const allowed = count <= hourlyLimit;

  if (!allowed) {
    logger.info("Rate limit reached", { senderId, hourWindow, count, hourlyLimit });
  }

  return { allowed, count };
}
