import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import multer from "multer";

const LOGOS_DIR = path.join(process.cwd(), "uploads", "logos");
mkdirSync(LOGOS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, LOGOS_DIR),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname) || `.${file.mimetype.split("/")[1] ?? "png"}`;
    cb(null, `${randomUUID()}${extension}`);
  },
});

export const uploadLogo = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed"));
      return;
    }
    cb(null, true);
  },
});
