import { Request, Response, NextFunction } from "express";
import { env, db, logger } from "../config";

// ────────────────────────────────────────────────────────────
// Slack OAuth — Authorize (redirect to Slack consent screen)
// ────────────────────────────────────────────────────────────

/**
 * GET /api/slack/oauth/authorize
 *
 * Generates the Slack OAuth consent URL and redirects the user.
 * Uses the `incoming-webhook` scope for posting notifications.
 */
export async function slackAuthorize(
  req: Request,
  res: Response
): Promise<void> {
  const userId = req.user!.userId;

  const params = new URLSearchParams({
    client_id: env.SLACK_CLIENT_ID,
    scope: "incoming-webhook",
    redirect_uri: env.SLACK_REDIRECT_URI,
    state: userId, // pass userId through OAuth state
  });

  res.redirect(`https://slack.com/oauth/v2/authorize?${params.toString()}`);
}

// ────────────────────────────────────────────────────────────
// Slack OAuth — Callback (exchange code for token)
// ────────────────────────────────────────────────────────────

/**
 * GET /api/slack/oauth/callback
 *
 * Exchanges the authorization code for an access token
 * using Slack's oauth.v2.access endpoint (real OAuth, not hardcoded).
 * Stores the token and webhook URL in SlackIntegration.
 */
export async function slackCallback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const code = req.query.code as string;
    const userId = req.query.state as string;

    if (!code || !userId) {
      res.status(400).json({
        error: { message: "Missing code or state", code: "INVALID_CALLBACK" },
      });
      return;
    }

    // Exchange code for access token via Slack API
    const response = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
        code,
        redirect_uri: env.SLACK_REDIRECT_URI,
      }),
    });

    const data = (await response.json()) as {
      ok: boolean;
      error?: string;
      team?: { id: string };
      access_token?: string;
      incoming_webhook?: { url: string };
    };

    if (!data.ok) {
      logger.error("Slack OAuth failed", { error: data.error });
      res.status(400).json({
        error: { message: `Slack OAuth failed: ${data.error}`, code: "SLACK_AUTH_FAILED" },
      });
      return;
    }

    // Upsert the Slack integration
    await db.slackIntegration.upsert({
      where: { userId },
      create: {
        userId,
        teamId: data.team?.id || "",
        accessToken: data.access_token || "",
        webhookUrl: data.incoming_webhook?.url || "",
      },
      update: {
        teamId: data.team?.id || "",
        accessToken: data.access_token || "",
        webhookUrl: data.incoming_webhook?.url || "",
        connectedAt: new Date(),
      },
    });

    logger.info("Slack connected", { userId, teamId: data.team?.id });

    // Redirect to frontend
    res.redirect(`${env.FRONTEND_URL}/dashboard?slack=connected`);
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────
// Disconnect Slack
// ────────────────────────────────────────────────────────────

/**
 * DELETE /api/slack/disconnect
 */
export async function slackDisconnect(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;

    await db.slackIntegration.deleteMany({ where: { userId } });

    logger.info("Slack disconnected", { userId });
    res.json({ message: "Slack disconnected successfully" });
  } catch (err) {
    next(err);
  }
}

// ────────────────────────────────────────────────────────────
// Get Slack Status
// ────────────────────────────────────────────────────────────

/**
 * GET /api/slack/status
 */
export async function slackStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.userId;

    const slack = await db.slackIntegration.findUnique({
      where: { userId },
      select: { teamId: true, connectedAt: true },
    });

    res.json({
      connected: !!slack,
      teamId: slack?.teamId || null,
      connectedAt: slack?.connectedAt || null,
    });
  } catch (err) {
    next(err);
  }
}
