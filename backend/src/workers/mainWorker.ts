import { Worker, Job, DelayedError } from "bullmq";
import { bullMqConnection, env, db, logger } from "../config";
import { emailProcessor, EmailJobData } from "../services/emailProcessor";
import { retryEmailQueue } from "../queues/retryEmailQueue";
import { indexEmailInElasticsearch } from "../services/elasticsearchIndexer";

/**
 * Exponential backoff delay for retries.
 * attempt 1 → 10s, attempt 2 → 40s, attempt 3 → 90s, etc.
 */
function backoffDelay(attemptsMade: number): number {
  return Math.pow(attemptsMade + 1, 2) * 10_000;
}

/**
 * Main Worker — consumes the `scheduled-email` queue.
 *
 * concurrency: 5 — processes up to 5 jobs simultaneously.
 * Calls the shared `emailProcessor()` for the actual pipeline.
 */
export const mainWorker = new Worker<EmailJobData>(
  "scheduled-email",
  async (job: Job<EmailJobData>) => {
    await emailProcessor(job);
  },
  {
    connection: bullMqConnection,
    concurrency: 5,
  }
);

// ── Failed handler — routes failed jobs to retry-email queue
// ────────────────────────────────────────────────────────────

mainWorker.on("failed", async (job, err) => {
  if (!job) return;

  // Ignore rate limit or inter-email delays
  if (err instanceof DelayedError || err.name === "DelayedError" || err.message?.includes("DelayedError")) {
    logger.info("Job was delayed (rate limit or inter-email delay), not a failure", { jobId: job.id });
    return;
  }

  logger.warn("Main worker job failed", {
    jobId: job.id,
    emailId: job.data.emailId,
    error: err.message,
  });

  try {
    // Look up how many SMTP attempts have failed so far in the DB
    const attemptsCount = await db.emailAttempt.count({
      where: { emailId: job.data.emailId },
    });

    if (attemptsCount < env.MAX_ATTEMPTS) {
      // Route to retry queue — PRESERVE the same jobId for idempotency
      await retryEmailQueue.add("retry-email", job.data, {
        jobId: job.id!, // same deterministic jobId
        delay: backoffDelay(attemptsCount),
      });

      logger.info("Routed to retry queue", {
        jobId: job.id,
        attempt: attemptsCount,
        delay: backoffDelay(attemptsCount),
      });
    } else {
      // Attempts exhausted — mark as failed permanently
      await db.email.update({
        where: { id: job.data.emailId },
        data: { status: "failed" },
      });

      // Index the failure in ES (best-effort)
      indexEmailInElasticsearch(job.data.emailId).catch((e) =>
        logger.error("ES index failed for exhausted email", { error: (e as Error).message })
      );

      logger.error("Email permanently failed after max attempts", {
        jobId: job.id,
        emailId: job.data.emailId,
        maxAttempts: env.MAX_ATTEMPTS,
      });
    }
  } catch (dbErr) {
    logger.error("Failed to execute main worker failed handler", {
      jobId: job.id,
      error: (dbErr as Error).message,
    });
  }
});

mainWorker.on("completed", (job) => {
  logger.info("Main worker job completed", { jobId: job.id, emailId: job.data.emailId });
});

mainWorker.on("error", (err) => {
  logger.error("Main worker error", { error: err.message });
});

logger.info("Main Worker started", { queue: "scheduled-email", concurrency: 5 });
