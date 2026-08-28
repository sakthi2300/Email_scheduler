import { Request, Response, NextFunction } from "express";
import { parse } from "csv-parse/sync";

/**
 * POST /api/leads/upload
 *
 * Accepts a CSV or TXT file upload, parses it to extract
 * email addresses, and returns the count + preview.
 *
 * CSV: looks for an "email" column header (case-insensitive).
 * TXT: treats each line as an email address.
 */
export async function uploadLeads(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({
        error: { message: "No file uploaded", code: "NO_FILE" },
      });
      return;
    }

    const content = req.file.buffer.toString("utf-8");
    const ext = req.file.originalname.toLowerCase();
    let emails: string[] = [];

    if (ext.endsWith(".csv")) {
      // Parse CSV — look for "email" column
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      for (const record of records) {
        // Case-insensitive column lookup
        const emailKey = Object.keys(record).find(
          (key) => key.toLowerCase() === "email"
        );
        if (emailKey && record[emailKey]) {
          emails.push(record[emailKey].trim());
        }
      }
    } else {
      // TXT: each line is an email
      emails = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && line.includes("@"));
    }

    // Deduplicate
    emails = [...new Set(emails)];

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    emails = emails.filter((email) => emailRegex.test(email));

    res.json({
      count: emails.length,
      preview: emails.slice(0, 10),
      emails,
    });
  } catch (err) {
    next(err);
  }
}
