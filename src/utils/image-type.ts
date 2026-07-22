// Detects real image type from file content (magic bytes) rather than the
// client-supplied filename/Content-Type, both of which are trivially
// spoofable — a request can claim any mimetype/extension regardless of what
// bytes actually follow.
const SIGNATURES: { ext: string; mime: string; matches: (buf: Buffer) => boolean }[] = [
  {
    ext: "png",
    mime: "image/png",
    matches: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a,
  },
  {
    ext: "jpg",
    mime: "image/jpeg",
    matches: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: "webp",
    mime: "image/webp",
    matches: (b) => b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
  },
];

export function detectImageType(buffer: Buffer): { ext: string; mime: string } | null {
  const match = SIGNATURES.find((s) => s.matches(buffer));
  return match ? { ext: match.ext, mime: match.mime } : null;
}
