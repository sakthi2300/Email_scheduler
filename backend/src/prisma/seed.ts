import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";

/**
 * Seed script — creates a test user (with both local password and Google ID)
 * and an Ethereal sender account.
 *
 * Usage: npm run seed (or: npx tsx src/prisma/seed.ts)
 */
async function main(): Promise<void> {
  const db = new PrismaClient();

  try {
    console.log("🌱 Seeding database...\n");

    // Hash a default password: password123
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("password123", salt);

    // 1. Create/update test user (has both local auth & Google ID for testing linking)
    const user = await db.user.upsert({
      where: { email: "testuser@example.com" },
      update: {
        passwordHash,
        googleId: "test-google-id-12345",
      },
      create: {
        googleId: "test-google-id-12345",
        email: "testuser@example.com",
        name: "Test User",
        avatarUrl: "https://ui-avatars.com/api/?name=Test+User&background=6366f1&color=fff",
        passwordHash,
      },
    });

    console.log(`✅ User created: ${user.name} (${user.email})`);
    console.log(`   Password: password123`);
    console.log(`   ID: ${user.id}\n`);

    // 2. Create an Ethereal test account as a sender
    console.log("📧 Creating Ethereal test account...");
    const testAccount = await nodemailer.createTestAccount();

    const sender = await db.sender.upsert({
      where: { id: "seed-sender-id" },
      update: {
        smtpUser: testAccount.user,
        smtpPass: testAccount.pass,
      },
      create: {
        id: "seed-sender-id",
        userId: user.id,
        smtpUser: testAccount.user,
        smtpPass: testAccount.pass,
        hourlyLimit: 200,
      },
    });

    console.log(`✅ Sender created: ${sender.smtpUser}`);
    console.log(`   ID: ${sender.id}`);
    console.log(`   SMTP User: ${testAccount.user}`);
    console.log(`   SMTP Pass: ${testAccount.pass}`);
    console.log(`   Ethereal URL: https://ethereal.email/login\n`);

    console.log("🎉 Seeding complete!\n");
    console.log("─── Quick Start ───");
    console.log(`User ID:   ${user.id}`);
    console.log(`Sender ID: ${sender.id}`);
    console.log("You can now use these credentials to test the login.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
