import { db, logger } from "../config";

/**
 * Slack notifier — sends messages via the user's stored Slack webhook.
 *
 * This is a best-effort notification system:
 * - If Slack is not connected for the sender's user, it skips silently.
 * - If the webhook call fails, it logs the error but never throws.
 * - No redeploy needed once connected — it reads the token from DB each time.
 */

type NotificationType = "hourly_limit_reached" | "email_failed" | "batch_complete";

/**
 * Build a human-readable Slack message based on the notification type.
 */
function buildMessage(type: NotificationType, context: Record<string, string>): string {
  switch (type) {
    case "hourly_limit_reached":
      return `⚠️ *Rate Limit Hit* — Sender \`${context.senderId}\` has reached the hourly email limit. Emails will be delayed to the next hour window.`;
    case "email_failed":
      return `❌ *Email Failed* — Email \`${context.emailId}\` to \`${context.recipient}\` has exhausted all retry attempts.`;
    case "batch_complete":
      return `✅ *Batch Complete* — Batch \`${context.batchId}\` has finished processing.`;
    default:
      return `ℹ️ Notification: ${type}`;
  }
}

/**
 * Send a Slack notification if the sender's user has Slack connected.
 * Skips silently if not connected — no crash, no thrown error.
 */
export async function notifySlackIfConnected(
  senderId: string,
  type: NotificationType,
  context: Record<string, string> = {}
): Promise<void> {
  try {
    // Look up the sender to find the userId
    const sender = await db.sender.findUnique({
      where: { id: senderId },
      select: { userId: true },
    });

    if (!sender) {
      logger.debug("Slack notify skipped: sender not found", { senderId });
      return;
    }

    // Check if the user has Slack connected
    const slack = await db.slackIntegration.findUnique({
      where: { userId: sender.userId },
    });

    if (!slack || !slack.webhookUrl) {
      logger.debug("Slack notify skipped: not connected", { userId: sender.userId });
      return;
    }

    // Send the notification via incoming webhook
    const message = buildMessage(type, { senderId, ...context });

    const response = await fetch(slack.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message }),
    });

    if (!response.ok) {
      logger.warn("Slack webhook returned non-OK", {
        status: response.status,
        userId: sender.userId,
      });
    }
  } catch (err) {
    // Best-effort: log but never throw
    logger.error("Slack notification failed", {
      senderId,
      type,
      error: (err as Error).message,
    });
  }
}
