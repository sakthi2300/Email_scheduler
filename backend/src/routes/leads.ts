import { Router } from "express";
import { uploadLeads } from "../controllers/leadsController";
import { authGuard, upload } from "../middleware";

const router = Router();

/**
 * Leads Routes — requires authentication.
 *
 * POST /api/leads/upload → Upload CSV/TXT, parse emails
 */
router.post("/upload", authGuard, upload.single("file"), uploadLeads);

export default router;
