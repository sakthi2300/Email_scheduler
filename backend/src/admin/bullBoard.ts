import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { scheduledEmailQueue } from "../queues/scheduledEmailQueue";
import { retryEmailQueue } from "../queues/retryEmailQueue";

/**
 * Bull-Board admin UI — live view of both queues.
 *
 * Mounted at `/admin/queues` on the Express app.
 * Shows job states, retries, delays, and failures
 * for both `scheduled-email` and `retry-email` queues.
 */
export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

createBullBoard({
  queues: [
    new BullMQAdapter(scheduledEmailQueue),
    new BullMQAdapter(retryEmailQueue),
  ],
  serverAdapter,
});
