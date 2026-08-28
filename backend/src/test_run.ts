import { PrismaClient } from "@prisma/client";

/**
 * Automated test script — programmatically schedules a batch of 3 emails
 * with an hourly rate limit of 1. Verifies that the first email goes through
 * and the remaining emails get rate-limited and delayed to the next hour.
 */
async function runTest(): Promise<void> {
  const db = new PrismaClient();
  const baseUrl = "http://127.0.0.1:4000";

  try {
    console.log("🧪 Starting Automated Rate Limit Integration Test...\n");

    // 1. Sign In to get session JWT
    console.log("🔐 Authenticating with test user...");
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "testuser@example.com",
        password: "password123",
      }),
    });

    if (!loginRes.ok) {
      const err = await loginRes.json();
      throw new Error(`Login failed: ${JSON.stringify(err)}`);
    }

    const loginData = (await loginRes.json()) as any;
    console.log(`✅ Authenticated successfully as: ${loginData.user.name}`);

    // Extract cookie
    const cookie = loginRes.headers.get("set-cookie");
    if (!cookie) {
      throw new Error("No token cookie returned in login response headers");
    }

    // 2. Schedule a batch of 3 emails with hourlyLimit = 1
    const schedulePayload = {
      subject: "Test Hourly Rate Limit",
      body: "<p>Hello! This is a test email sent from the ReachInbox Scheduler.</p>",
      leads: ["lead01@example.com", "lead02@example.com", "lead03@example.com"],
      senderId: "seed-sender-id",
      startTime: new Date(Date.now() + 1000).toISOString(), // start in 1 second
      delayBetweenEmailsMs: 1000,
      hourlyLimit: 1, // trigger rate-limiting immediately after the 1st email
    };

    console.log("\n📬 Scheduling email batch (3 recipients, hourly limit = 1)...");
    const scheduleRes = await fetch(`${baseUrl}/api/emails/schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookie,
      },
      body: JSON.stringify(schedulePayload),
    });

    if (!scheduleRes.ok) {
      const err = await scheduleRes.json();
      throw new Error(`Scheduling failed: ${JSON.stringify(err)}`);
    }

    const batchData = (await scheduleRes.json()) as any;
    console.log(`✅ Batch successfully scheduled! Batch ID: ${batchData.batchId}`);

    // 3. Wait for workers to process jobs (give them 8 seconds)
    console.log("\n⏳ Waiting 8 seconds for BullMQ workers to process the emails...");
    await new Promise((resolve) => setTimeout(resolve, 8000));

    // 4. Verify statuses in MySQL
    console.log("\n📊 Querying MySQL for email delivery statuses:");
    const emails = await db.email.findMany({
      where: { batchId: batchData.batchId },
      orderBy: { scheduledTime: "asc" },
      select: {
        recipientEmail: true,
        status: true,
        sentTime: true,
        jobId: true,
      },
    });

    let success = true;

    emails.forEach((email, index) => {
      console.log(`   - [${index + 1}] ${email.recipientEmail}: status = ${email.status}`);
      
      if (index === 0) {
        // First email should have been sent successfully
        if (email.status !== "sent") {
          console.error(`     ❌ Expected status "sent", but found "${email.status}"`);
          success = false;
        } else {
          console.log(`     ✅ Sent successfully at ${email.sentTime}`);
        }
      } else {
        // Second and third emails should be delayed
        if (email.status !== "delayed") {
          console.error(`     ❌ Expected status "delayed", but found "${email.status}"`);
          success = false;
        } else {
          console.log(`     ✅ Successfully rate limited and delayed to the next hour`);
        }
      }
    });

    if (success) {
      console.log("\n🎉 TEST PASSED! The rate limiting and delay transitions worked perfectly without worker errors.");
    } else {
      console.log("\n❌ TEST FAILED. Check backend logs for details.");
    }

  } catch (err: any) {
    console.error("\n❌ Test execution failed:", err.message);
  } finally {
    await db.$disconnect();
  }
}

runTest();
