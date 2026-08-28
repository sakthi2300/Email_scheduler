import { Worker, Job, DelayedError } from "bullmq";
import { bullMqConnection, env, db, logger } from "../config";
import { emailProcessor, EmailJobData } from "../services/emailProcessor";
import { retryEmailQueue } from "../queues/retryEmailQueue";
import { notifySlackIfConnected } from "../services/slackNotifier";
import { indexEmailInElasticsearch } from "../services/elasticsearchIndexer";

/**
 * Exponential backoff delay for retries.
 */
function backoffDelay(attemptsMade: number): number {
  return Math.pow(attemptsMade + 1, 2) * 10_000;
}

/**
 * Retry Worker — consumes the `retry-email` queue.
 *
 * concurrency: 2 — lower than Main Worker to isolate retry
 * traffic and prevent it from starving fresh sends.
 *
 * Calls the SAME `emailProcessor()` as Main Worker.
 */
export const retryWorker = new Worker<EmailJobData>(
  "retry-email",
  async (job: Job<EmailJobData>) => {
    await emailProcessor(job);
  },
  {
    connection: bullMqConnection,
    concurrency: 2,
  }
);

// ────────────────────────────────────────────────────────────
// Failed handler — exhausted attempts only, NO re-enqueue
// ────────────────────────────────────────────────────────────

retryWorker.on("failed", async (job, err) => {
  if (!job) return;

  // Ignore rate limit or inter-email delays
  if (err instanceof DelayedError || err.name === "DelayedError" || err.message?.includes("DelayedError")) {
    logger.info("Retry worker job was delayed (rate limit or inter-email delay), not a failure", { jobId: job.id });
    return;
  }

  logger.warn("Retry worker job failed", {
    jobId: job.id,
    emailId: job.data.emailId,
    error: err.message,
  });

  try {
    const attemptsCount = await db.emailAttempt.count({
      where: { emailId: job.data.emailId },
    });

    if (attemptsCount < env.MAX_ATTEMPTS) {
      // Re-enqueue in retry-email queue with backoff delay
      await retryEmailQueue.add("retry-email", job.data, {
        jobId: job.id!,
        delay: backoffDelay(attemptsCount),
      });

      logger.info("Retry worker: re-enqueued to retry queue", {
        jobId: job.id,
        attempt: attemptsCount,
        delay: backoffDelay(attemptsCount),
      });
    } else {
      // Always mark as failed — attempts exhausted
      await db.email.update({
        where: { id: job.data.emailId },
        data: { status: "failed" },
      });

      // Index the final failure in ES (best-effort)
      indexEmailInElasticsearch(job.data.emailId).catch((e) =>
        logger.error("ES index failed for retry-exhausted email", { error: (e as Error).message })
      );

      // Slack notification on permanently failed email!
      await notifySlackIfConnected(job.data.senderId, "email_failed", {
        emailId: job.data.emailId,
        recipient: job.data.recipientEmail,
      });

      logger.error("Retry worker: email permanently failed after max attempts", {
        jobId: job.id,
        emailId: job.data.emailId,
        maxAttempts: env.MAX_ATTEMPTS,
      });
    }
  } catch (dbErr) {
    logger.error("Failed to execute retry worker failed handler", {
      jobId: job.id,
      error: (dbErr as Error).message,
    });
  }
});

retryWorker.on("completed", (job) => {
  logger.info("Retry worker job completed", { jobId: job.id, emailId: job.data.emailId });
});

retryWorker.on("error", (err) => {
  logger.error("Retry worker error", { error: err.message });
});

logger.info("Retry Worker started", { queue: "retry-email", concurrency: 2 });
