import { Queue } from "bullmq";
import { bullMqConnection } from "../config";
import { EmailJobData } from "../services/emailProcessor";

/**
 * Retry-email queue — populated ONLY by Main Worker's
 * `failed` event handler when a job fails with
 * attemptsMade < MAX_ATTEMPTS.
 *
 * Retry Worker consumes this queue at concurrency: 2.
 * Isolates retry traffic so it can't starve fresh sends.
 */
export const retryEmailQueue = new Queue<EmailJobData>("retry-email", {
  connection: bullMqConnection,
  defaultJobOptions: {
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 500 },
  },
});
