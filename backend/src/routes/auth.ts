import { Router } from "express";
import { googleLogin, googleCallback, logout, getMe, signup, login } from "../controllers/authController";
import { authGuard } from "../middleware";

const router = Router();

/**
 * Auth Routes
 *
 * GET  /api/auth/google           → Redirect to Google consent screen
 * GET  /api/auth/google/callback  → Handle OAuth callback, issue JWT cookie
 * POST /api/auth/signup           → Local registration
 * POST /api/auth/login            → Local login
 * POST /api/auth/logout           → Clear JWT cookie
 * GET  /api/auth/me               → Get current user (requires auth)
 */
router.get("/google", googleLogin);
router.get("/google/callback", googleCallback);
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", authGuard, getMe);

export default router;
