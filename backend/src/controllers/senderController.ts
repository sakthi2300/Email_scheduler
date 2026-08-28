import { Request, Response, NextFunction } from "express";
import nodemailer from "nodemailer";
import { db, logger } from "../config";

// ────────────────────────────────────────────────────────────
// Create Sender (auto-creates an Ethereal account)
// ────────────────────────────────────────────────────────────

/**
 * POST /api/senders
 *
 * Creates a new Ethereal Email account and stores the
 * SMTP credentials as a Sender for the authenticated user.
 */
export async function createSender(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { hourlyLimit } = req.body;

    // Create an Ethereal test account
    const testAccount = await nodemailer.createTestAccount();

    const sender = await db.sender.create({
      data: {
        userId,
        smtpUser: testAccount.user,
        smtpPass: testAccount.pass,
        hourlyLimit: hourlyLimit || 200,
      },
    });

    logger.info("Sender created with Ethereal account", {
      senderId: sender.id,
      smtpUser: testAccount.user,
    });

    res.status(201).json({
      id: sender.id,
      smtpUser: sender.smtpUser,
      hourlyLimit: sender.hourlyLimit,
      createdAt: sender.createdAt,
      // Note: smtpPass is NOT returned to the client
    });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────
// List Senders
// ────────────────────────────────────────────────────────────

/**
 * GET /api/senders
 *
 * Returns all senders for the authenticated user.
 * Password is excluded from the response.
 */
export async function getSenders(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;

    const senders = await db.sender.findMany({
      where: { userId },
      select: {
        id: true,
        smtpUser: true,
        hourlyLimit: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ data: senders });
  } catch (err) {
    next(err);
  }
}
