import { db } from "../config";

/**
 * Idempotency check — the CHEAPEST guard, always runs first.
 *
 * MySQL is the authoritative source of truth for email status.
 * If the email is already marked as `sent`, we skip processing entirely.
 * This prevents duplicate sends even if the same job runs multiple times
 * (e.g., after a server restart or cross-queue retry).
 *
 * @returns `true` if the email has already been sent (skip processing)
 */
export async function isAlreadySent(emailId: string): Promise<boolean> {
  const email = await db.email.findUnique({
    where: { id: emailId },
    select: { status: true },
  });

  return email?.status === "sent";
}
