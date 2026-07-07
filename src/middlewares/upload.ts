import multer from "multer";

// Buffers the file in memory instead of writing straight to disk — the
// content is verified (magic bytes, see utils/image-type.ts) and only then
// written to disk with a server-derived name/extension, never trusting the
// client-supplied filename or Content-Type.
export const uploadLogo = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});
