import { HttpError } from "../middlewares/errorHandler";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseId(id: unknown): string {
  if (typeof id !== "string" || !UUID_RE.test(id)) {
    throw new HttpError(400, "Invalid id format, expected a UUID");
  }
  return id;
}
