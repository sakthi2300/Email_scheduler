import { Router } from "express";
import {
  scheduleEmails,
  getScheduledEmails,
  getSentEmails,
  getEmailById,
  deleteEmail,
  searchEmailsHandler,
} from "../controllers/emailController";
import { authGuard } from "../middleware";

const router = Router();

/**
 * Email Routes — all require authentication.
 *
 * POST   /api/emails/schedule    → Fan-out batch scheduling
 * GET    /api/emails/scheduled   → Paginated scheduled emails
 * GET    /api/emails/sent        → Paginated sent/failed emails
 * GET    /api/emails/search      → Elasticsearch-backed search
 * GET    /api/emails/:id         → Single email with attempts
 * DELETE /api/emails/:id         → Delete email + cancel BullMQ job
 */
router.post("/schedule", authGuard, scheduleEmails);
router.get("/scheduled", authGuard, getScheduledEmails);
router.get("/sent", authGuard, getSentEmails);
router.get("/search", authGuard, searchEmailsHandler);
router.get("/:id", authGuard, getEmailById);
router.delete("/:id", authGuard, deleteEmail);

export default router;
