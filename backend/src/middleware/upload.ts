import multer from "multer";
import path from "path";
import { createAppError } from "./errorHandler";

/**
 * Multer config for CSV/TXT lead uploads.
 * Files are stored in memory (buffer) since we parse them inline.
 */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".csv" || ext === ".txt") {
      cb(null, true);
    } else {
      cb(createAppError("Only .csv and .txt files are allowed", 400, "INVALID_FILE_TYPE"));
    }
  },
});
