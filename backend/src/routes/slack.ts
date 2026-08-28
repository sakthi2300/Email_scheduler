import { Router } from "express";
import {
  slackAuthorize,
  slackCallback,
  slackDisconnect,
  slackStatus,
} from "../controllers/slackController";
import { authGuard } from "../middleware";

const router = Router();

/**
 * Slack Routes
 *
 * GET    /api/slack/oauth/authorize  → Redirect to Slack consent (auth required)
 * GET    /api/slack/oauth/callback   → Handle OAuth callback (no auth — Slack redirects here)
 * DELETE /api/slack/disconnect       → Remove Slack integration (auth required)
 * GET    /api/slack/status           → Check connection status (auth required)
 */
router.get("/oauth/authorize", authGuard, slackAuthorize);
router.get("/oauth/callback", slackCallback); // no authGuard — callback from Slack
router.delete("/disconnect", authGuard, slackDisconnect);
router.get("/status", authGuard, slackStatus);

export default router;
