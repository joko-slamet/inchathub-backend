import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { apiRouter } from "./routes";

export const app = express();

// Trust the first proxy hop (nginx/Cloudflare/tunnel in front of this app) so
// req.ip reflects the real client IP from X-Forwarded-For — without this,
// the rate limiters below would see every request as coming from the same
// proxy IP and rate-limit all users collectively instead of individually.
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());

// Serves AI-generated article images. Needs an explicit CORP header since
// helmet's default "same-origin" policy would otherwise block the frontend
// (a different origin) from rendering these images.
app.use(
  "/uploads",
  (_req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    next();
  },
  express.static(path.join(process.cwd(), "uploads")),
);

app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
