import { Router } from "express";
import { createSender, getSenders } from "../controllers/senderController";
import { authGuard } from "../middleware";

const router = Router();

/**
 * Sender Routes — all require authentication.
 *
 * POST /api/senders  → Create a new Ethereal sender account
 * GET  /api/senders  → List user's senders
 */
router.post("/", authGuard, createSender);
router.get("/", authGuard, getSenders);

export default router;
