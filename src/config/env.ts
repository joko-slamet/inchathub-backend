import "dotenv/config";

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

const duitkuEnv = process.env.DUITKU_ENV === "production" ? "production" : "sandbox";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",
  nodeEnv: process.env.NODE_ENV ?? "development",
  // Publicly reachable base URL of THIS backend, used to build the Duitku
  // callback URL. Duitku's servers call this over the internet, so in local
  // dev it must be a tunnel (e.g. ngrok), not localhost.
  apiPublicUrl: process.env.API_PUBLIC_URL ?? `http://localhost:${Number(process.env.PORT ?? 4000)}`,
  duitku: {
    merchantCode: process.env.DUITKU_MERCHANT_CODE ?? "",
    apiKey: process.env.DUITKU_API_KEY ?? "",
    env: duitkuEnv,
    baseUrl:
      duitkuEnv === "production" ? "https://passport.duitku.com" : "https://sandbox.duitku.com",
  },
};
