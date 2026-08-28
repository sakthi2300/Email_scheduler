import { Queue } from "bullmq";
import { bullMqConnection } from "../config";
import { EmailJobData } from "../services/emailProcessor";

/**
 * Scheduled-email queue — populated ONLY by the API
 * when a batch is scheduled (fan-out: one job per recipient).
 *
 * Main Worker consumes this queue at concurrency: 5.
 */
export const scheduledEmailQueue = new Queue<EmailJobData>("scheduled-email", {
  connection: bullMqConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 1000 },   // keep last 1000 completed for Bull-Board
    removeOnFail: { count: 500 },        // keep last 500 failed for inspection
  },
});
