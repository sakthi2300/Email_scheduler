import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { db, logger, esClient, EMAIL_INDEX } from "../config";
import { scheduledEmailQueue } from "../queues/scheduledEmailQueue";
import { searchEmails, indexEmailInElasticsearch } from "../services/elasticsearchIndexer";

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

/**
 * Generate a deterministic jobId from batchId + recipientEmail.
 * Uses SHA-256, truncated to 32 chars for readability.
 */
function generateJobId(batchId: string, recipientEmail: string): string {
  return crypto
    .createHash("sha256")
    .update(`${batchId}:${recipientEmail}`)
    .digest("hex")
    .slice(0, 32);
}

// ────────────────────────────────────────────────────────────
// Schedule Emails (fan-out)
// ────────────────────────────────────────────────────────────

/**
 * POST /api/emails/schedule
 *
 * Creates an EmailBatch, fans out into per-recipient Email rows
 * and BullMQ jobs with deterministic jobIds and staggered delays.
 *
 * Body: { subject, body, leads[], senderId, startTime, delayBetweenEmailsMs, hourlyLimit }
 *
 * Returns immediately with { batchId, totalScheduled }.
 */
export async function scheduleEmails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const {
      subject,
      body,
      leads,
      senderId,
      startTime,
      delayBetweenEmailsMs,
      hourlyLimit,
    } = req.body;

    // Validate required fields
    if (!subject || !body || !leads?.length || !senderId || !startTime) {
      res.status(400).json({
        error: {
          message: "Missing required fields: subject, body, leads, senderId, startTime",
          code: "VALIDATION_ERROR",
        },
      });
      return;
    }

    // Verify sender belongs to user
    const sender = await db.sender.findFirst({
      where: { id: senderId, userId },
    });

    if (!sender) {
      res.status(404).json({
        error: { message: "Sender not found or not owned by user", code: "SENDER_NOT_FOUND" },
      });
      return;
    }

    const delayMs = delayBetweenEmailsMs || 2000;
    const limit = hourlyLimit || sender.hourlyLimit;
    const scheduleStart = new Date(startTime);

    // Create the batch
    const batch = await db.emailBatch.create({
      data: {
        userId,
        senderId,
        subject,
        body,
        startTime: scheduleStart,
        delayBetweenEmailsMs: delayMs,
        hourlyLimit: limit,
      },
    });

    // Fan-out: create Email rows + BullMQ jobs
    const emailRecords = [];
    const queueJobs = [];

    for (let i = 0; i < leads.length; i++) {
      const recipientEmail = leads[i].trim();
      if (!recipientEmail) continue;

      const jobId = generateJobId(batch.id, recipientEmail);
      const scheduledTime = new Date(scheduleStart.getTime() + i * delayMs);

      emailRecords.push({
        batchId: batch.id,
        senderId,
        recipientEmail,
        subject,
        body,
        jobId,
        status: "scheduled" as const,
        scheduledTime,
      });

      // Staggered delay: each email gets an additional delay offset
      const delay = Math.max(0, scheduledTime.getTime() - Date.now());

      queueJobs.push({
        name: "scheduled-email",
        data: {
          emailId: "", // will be set after DB insert
          senderId,
          recipientEmail,
          subject,
          body,
          batchId: batch.id,
          smtpUser: sender.smtpUser,
          smtpPass: sender.smtpPass,
          hourlyLimit: limit,
        },
        opts: {
          jobId,
          delay,
        },
      });
    }

    // Bulk-create email records
    const createdEmails = [];
    for (const record of emailRecords) {
      const email = await db.email.create({ data: record });
      createdEmails.push(email);
    }

    // Index in Elasticsearch (best-effort, non-blocking)
    for (const email of createdEmails) {
      indexEmailInElasticsearch(email.id).catch((e) => {
        logger.error("Failed to index scheduled email in ES", {
          emailId: email.id,
          error: e.message,
        });
      });
    }

    // Now add jobs with correct emailIds
    for (let i = 0; i < createdEmails.length; i++) {
      queueJobs[i].data.emailId = createdEmails[i].id;
    }

    // Bulk-add to BullMQ queue
    await scheduledEmailQueue.addBulk(queueJobs);

    logger.info("Batch scheduled", {
      batchId: batch.id,
      totalScheduled: createdEmails.length,
      startTime: scheduleStart.toISOString(),
    });

    res.status(201).json({
      batchId: batch.id,
      totalScheduled: createdEmails.length,
    });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────
// Get Scheduled Emails (paginated)
// ────────────────────────────────────────────────────────────

/**
 * GET /api/emails/scheduled
 *
 * Returns paginated scheduled emails for the authenticated user.
 * Always returns { data: [], total, page } even when empty.
 */
export async function getScheduledEmails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search as string;

    const where: any = {
      batch: { userId },
      status: { in: ["scheduled" as const, "processing" as const, "delayed" as const] },
    };

    if (search) {
      where.AND = [
        {
          OR: [
            { recipientEmail: { contains: search } },
            { subject: { contains: search } },
          ]
        }
      ];
    }

    const [data, total] = await Promise.all([
      db.email.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledTime: "asc" },
        include: {
          sender: { select: { smtpUser: true } },
          batch: { select: { subject: true } },
        },
      }),
      db.email.count({ where }),
    ]);

    res.json({ data, total, page });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────
// Get Sent/Failed Emails (paginated)
// ────────────────────────────────────────────────────────────

/**
 * GET /api/emails/sent
 *
 * Returns paginated sent/failed emails. Filterable by status=sent|failed.
 * Always returns { data: [], total, page }.
 */
export async function getSentEmails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const statusFilter = req.query.status as string;
    const search = req.query.search as string;

    const statusIn =
      statusFilter === "sent"
        ? ["sent" as const]
        : statusFilter === "failed"
          ? ["failed" as const]
          : ["sent" as const, "failed" as const];

    const where: any = {
      batch: { userId },
      status: { in: statusIn },
    };

    if (search) {
      where.AND = [
        {
          OR: [
            { recipientEmail: { contains: search } },
            { subject: { contains: search } },
          ]
        }
      ];
    }

    const [data, total] = await Promise.all([
      db.email.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sentTime: "desc" },
        include: {
          sender: { select: { smtpUser: true } },
          batch: { select: { subject: true } },
        },
      }),
      db.email.count({ where }),
    ]);

    res.json({ data, total, page });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────
// Get Single Email (with attempts history)
// ────────────────────────────────────────────────────────────

/**
 * GET /api/emails/:id
 */
export async function getEmailById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const emailId = req.params.id as string;
    const email = await db.email.findUnique({
      where: { id: emailId },
      include: {
        attempts: { orderBy: { attemptedAt: "asc" } },
        sender: { select: { smtpUser: true } },
        batch: { select: { subject: true, body: true } },
      },
    });

    if (!email) {
      res.status(404).json({
        error: { message: "Email not found", code: "NOT_FOUND" },
      });
      return;
    }

    res.json(email);
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────
// Delete Email (soft-delete + remove BullMQ job)
// ────────────────────────────────────────────────────────────

/**
 * DELETE /api/emails/:id
 *
 * Removes the email and cancels the associated BullMQ job.
 */
export async function deleteEmail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const emailId = req.params.id as string;
    const email = await db.email.findUnique({
      where: { id: emailId },
    });

    if (!email) {
      res.status(404).json({
        error: { message: "Email not found", code: "NOT_FOUND" },
      });
      return;
    }

    // Try to remove the BullMQ job (may already be processed)
    try {
      const job = await scheduledEmailQueue.getJob(email.jobId);
      if (job) {
        await job.remove();
        logger.info("Removed BullMQ job", { jobId: email.jobId });
      }
    } catch (e) {
      logger.warn("Could not remove BullMQ job", {
        jobId: email.jobId,
        error: (e as Error).message,
      });
    }

    // Delete attempts first (FK constraint), then the email
    await db.emailAttempt.deleteMany({ where: { emailId: email.id } });
    await db.email.delete({ where: { id: email.id } });

    // Delete from Elasticsearch index (best-effort)
    esClient.delete({
      index: EMAIL_INDEX,
      id: email.id,
    }).catch((e) => {
      logger.warn("Failed to delete email from ES index upon deletion", {
        emailId: email.id,
        error: e.message,
      });
    });

    res.json({ message: "Email deleted successfully" });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────
// Search Emails (Elasticsearch-backed)
// ────────────────────────────────────────────────────────────

/**
 * GET /api/emails/search?q=
 */
export async function searchEmailsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!query) {
      res.status(400).json({
        error: { message: "Missing search query parameter 'q'", code: "VALIDATION_ERROR" },
      });
      return;
    }

    const results = await searchEmails(query, page, limit);
    res.json(results);
  } catch (err) {
    next(err);
  }
}
