import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { apiRouter } from "./routes";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);
