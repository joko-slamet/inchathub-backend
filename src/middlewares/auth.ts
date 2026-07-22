import type { NextFunction, Request, Response } from "express";
import type { Role } from "../generated/prisma/enums";
import { verifyToken } from "../utils/jwt";
import { HttpError } from "./errorHandler";

export const AUTH_COOKIE_NAME = "token";

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  return req.cookies?.[AUTH_COOKIE_NAME];
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    throw new HttpError(401, "Authentication required");
  }
  try {
    req.user = verifyToken(token);
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
  next();
}

export function authorize(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new HttpError(403, "Insufficient permissions");
    }
    next();
  };
}
