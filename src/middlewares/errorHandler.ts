import type { NextFunction, Request, Response } from "express";
import { Prisma } from "../generated/prisma/client";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found" });
}

function fromPrismaError(err: Prisma.PrismaClientKnownRequestError): HttpError | undefined {
  if (err.code === "P2002") return new HttpError(409, "A record with this value already exists");
  if (err.code === "P2025") return new HttpError(404, "Record not found");
  return undefined;
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const httpError =
    err instanceof HttpError
      ? err
      : err instanceof Prisma.PrismaClientKnownRequestError
        ? fromPrismaError(err)
        : undefined;

  const status = httpError?.status ?? 500;
  const message = httpError?.message ?? "Internal server error";

  if (status === 500) {
    console.error(err);
  }

  res.status(status).json({ error: message });
}
