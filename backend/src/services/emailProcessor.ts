import { Job, DelayedError } from "bullmq";
import nodemailer from "nodemailer";
import { db, logger } from "../config";
import { checkRateLimit, msUntilNextHour } from "./rateLimiter";
import { checkInterEmailDelay } from "./interEmailDelay";
import { notifySlackIfConnected } from "./slackNotifier";
import { indexEmailInElasticsearch } from "./elasticsearchIndexer";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

/**
 * Shape of the data payload stored in every BullMQ email job.
 */
export interface EmailJobData {
  emailId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  batchId: string;
  smtpUser: string;
  smtpPass: string;
  hourlyLimit: number;
}

// ────────────────────────────────────────────────────────────
// Sequential Pipeline
// ────────────────────────────────────────────────────────────

/**
 * The core email processing pipeline — shared by BOTH workers.
 *
 * Steps execute SEQUENTIALLY, each with an early return.
 * This is the single most important correctness constraint:
 *
 *   1. Idempotency check   (MySQL — cheapest, first)
 *   2. Rate limit check    (Redis atomic counter)
 *   3. Inter-email delay   (Redis timestamp gate)
 *   4. Send via Ethereal   (SMTP)
 *
 * NEVER run these in parallel. NEVER duplicate this logic
 * between workers — both call this exact function.
 */
export async function emailProcessor(job: Job<EmailJobData>): Promise<void> {
  const {
    emailId,
    senderId,
    recipientEmail,
    subject,
    body,
    smtpUser,
    smtpPass,
    hourlyLimit,
  } = job.data;

  logger.info("Processing email job", { jobId: job.id, emailId, recipientEmail });

  // ── Step 1: IDEMPOTENCY CHECK ─────────────────────────────
  // MySQL is authoritative. If already sent or deleted, skip entirely.
  // This makes retries, reprocessing, and cancellation safe.
  const emailRecord = await db.email.findUnique({
    where: { id: emailId },
    select: { status: true },
  });

  if (!emailRecord) {
    logger.info("Email record not found (cancelled or deleted), skipping send", { emailId });
    return;
  }

  if (emailRecord.status === "sent") {
    logger.info("Idempotency: email already sent, skipping", { emailId });
    return;
  }

  // Mark as processing
  await db.email.update({
    where: { id: emailId },
    data: { status: "processing" },
  });
  indexEmailInElasticsearch(emailId).catch(() => {});

  // ── Step 2: RATE LIMIT CHECK ──────────────────────────────
  // Redis atomic INCR, keyed by sender + hour window.
  // On hit: delay the SAME job to next hour. Never fail it.
  const { allowed } = await checkRateLimit(senderId, hourlyLimit);
  if (!allowed) {
    const delayMs = msUntilNextHour();
    await job.moveToDelayed(Date.now() + delayMs, job.token);

    await db.email.update({
      where: { id: emailId },
      data: { status: "delayed" },
    });
    indexEmailInElasticsearch(emailId).catch(() => {});

    // Best-effort Slack notification
    await notifySlackIfConnected(senderId, "hourly_limit_reached", { senderId });
    logger.info("Rate limited, delayed to next hour", { emailId, delayMs });
    throw new DelayedError();
  }

  // ── Step 3: INTER-EMAIL DELAY GATE ────────────────────────
  // Redis timestamp per sender. Enforces minimum gap between
  // sends even across concurrent workers.
  const waitFor = await checkInterEmailDelay(senderId);
  if (waitFor !== null) {
    await job.moveToDelayed(Date.now() + waitFor, job.token);

    await db.email.update({
      where: { id: emailId },
      data: { status: "delayed" },
    });
    indexEmailInElasticsearch(emailId).catch(() => {});

    logger.debug("Inter-email delay, job delayed", { emailId, waitFor });
    throw new DelayedError();
  }

  // ── Step 4: SEND VIA ETHEREAL SMTP ────────────────────────
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: smtpUser,
      to: recipientEmail,
      subject,
      html: body,
    });

    logger.info("Email sent via Ethereal", {
      emailId,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info),
    });

    // ── Success: update DB in a transaction ──
    const existingAttemptsCount = await db.emailAttempt.count({
      where: { emailId },
    });

    await db.$transaction([
      db.email.update({
        where: { id: emailId },
        data: { status: "sent", sentTime: new Date() },
      }),
      db.emailAttempt.create({
        data: {
          emailId,
          attemptNumber: existingAttemptsCount + 1,
          status: "success",
        },
      }),
    ]);

    // ── Async ES indexing — best-effort, never blocks send ──
    indexEmailInElasticsearch(emailId).catch((err) =>
      logger.error("ES index failed (non-blocking)", { emailId, error: (err as Error).message })
    );
  } catch (err) {
    // If it's a rate limit or delay action, do not log a failed attempt
    if (err instanceof DelayedError || (err as Error).name === "DelayedError") {
      throw err;
    }

    // ── Failure: record the attempt, then rethrow ──
    // Rethrowing lets BullMQ's `failed` handler fire so
    // Main Worker can route the job to retry-email queue.
    logger.error("Email send failed", {
      emailId,
      recipientEmail,
      error: (err as Error).message,
    });

    const existingAttemptsCount = await db.emailAttempt.count({
      where: { emailId },
    });

    await db.emailAttempt.create({
      data: {
        emailId,
        attemptNumber: existingAttemptsCount + 1,
        status: "failed",
        errorMessage: String(err),
      },
    });

    throw err; // rethrow for BullMQ failed handler
  }
}
