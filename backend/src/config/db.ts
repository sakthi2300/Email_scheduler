import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma client — reused across the application.
 * Logs queries in development for debugging.
 */
export const db = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});
