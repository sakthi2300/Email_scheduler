import dotenv from "dotenv";
dotenv.config();

export const env = {
  // Server
  PORT: parseInt(process.env.PORT || "4000", 10),
  NODE_ENV: process.env.NODE_ENV || "development",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",

  // MySQL (Prisma reads DATABASE_URL directly)
  DATABASE_URL: process.env.DATABASE_URL!,

  // Redis
  REDIS_HOST: process.env.REDIS_HOST || "localhost",
  REDIS_PORT: parseInt(process.env.REDIS_PORT || "6379", 10),

  // Elasticsearch
  ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL || "http://localhost:9200",

  // JWT
  JWT_SECRET: process.env.JWT_SECRET || "change-me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "",
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || "",
  GOOGLE_CALLBACK_URL:
    process.env.GOOGLE_CALLBACK_URL ||
    "http://localhost:4000/api/auth/google/callback",

  // Slack OAuth
  SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID || "",
  SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET || "",
  SLACK_REDIRECT_URI:
    process.env.SLACK_REDIRECT_URI ||
    "http://localhost:4000/api/slack/oauth/callback",

  // Rate limiting
  MAX_EMAILS_PER_HOUR: parseInt(process.env.MAX_EMAILS_PER_HOUR || "200", 10),

  // Inter-email delay
  EMAIL_DELAY_MS: parseInt(process.env.EMAIL_DELAY_MS || "2000", 10),

  // Retry
  MAX_ATTEMPTS: parseInt(process.env.MAX_ATTEMPTS || "3", 10),
} as const;
