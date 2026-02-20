import multer from "multer";
import fs from "fs";
import path from "path";

const uploadDir = path.resolve(process.cwd(), "tmp/uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}-${safe}`);
  }
});

export const upload = multer({
  storage,
  limits: {
    files: 10,
    fileSize: 20 * 1024 * 1024
  }
});

export function formatMulterError(err: unknown): string {
  if (!err) return "Unknown upload error";
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") return "Each file must be <= 20MB.";
    if (err.code === "LIMIT_FILE_COUNT") return "Maximum 10 files allowed per request.";
    return `Upload failed: ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return "Upload failed";
}
