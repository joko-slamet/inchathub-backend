import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
  nodeEnv: process.env.NODE_ENV ?? "development",
  // Publicly reachable base URL of THIS backend — used to build absolute
  // URLs for assets like AI-generated article images served from /uploads.
  apiPublicUrl: process.env.API_PUBLIC_URL ?? `http://localhost:${Number(process.env.PORT ?? 4000)}`,
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY ?? "",
    textModel: process.env.OPENROUTER_TEXT_MODEL ?? "google/gemini-2.5-flash",
    imageModel: process.env.OPENROUTER_IMAGE_MODEL ?? "google/gemini-2.5-flash-image-preview",
  },
};
