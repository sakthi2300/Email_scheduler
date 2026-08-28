import { esClient, EMAIL_INDEX, db, logger } from "../config";

/**
 * Elasticsearch indexer — indexes sent/failed emails for full-text search.
 *
 * CRITICAL: This is always called ASYNC and best-effort.
 * It must NEVER block or fail a send operation.
 */

/**
 * Ensure the emails index exists with proper mappings.
 * Called once on application startup.
 */
export async function ensureEmailIndex(): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: EMAIL_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: EMAIL_INDEX,
        body: {
          mappings: {
            properties: {
              emailId: { type: "keyword" },
              batchId: { type: "keyword" },
              senderId: { type: "keyword" },
              recipientEmail: { type: "keyword" },
              subject: { type: "text", analyzer: "standard" },
              body: { type: "text", analyzer: "standard" },
              status: { type: "keyword" },
              scheduledTime: { type: "date" },
              sentTime: { type: "date" },
              createdAt: { type: "date" },
            },
          },
        },
      });
      logger.info("Created Elasticsearch index", { index: EMAIL_INDEX });
    }
  } catch (err) {
    logger.error("Failed to ensure ES index", { error: (err as Error).message });
  }
}

/**
 * Index a single email document in Elasticsearch.
 * Fetches the full email from MySQL and indexes it.
 *
 * @param emailId - The email record ID to index
 */
export async function indexEmailInElasticsearch(emailId: string): Promise<void> {
  const email = await db.email.findUnique({
    where: { id: emailId },
    include: { batch: true },
  });

  if (!email) {
    logger.warn("Cannot index email: not found", { emailId });
    return;
  }

  await esClient.index({
    index: EMAIL_INDEX,
    id: emailId,
    document: {
      emailId: email.id,
      batchId: email.batchId,
      senderId: email.senderId,
      recipientEmail: email.recipientEmail,
      subject: email.subject,
      body: email.body,
      status: email.status,
      scheduledTime: email.scheduledTime.toISOString(),
      sentTime: email.sentTime?.toISOString() || null,
      createdAt: email.createdAt.toISOString(),
    },
  });

  logger.debug("Indexed email in ES", { emailId, status: email.status });
}

/**
 * Search emails in Elasticsearch by a query string.
 * Searches across subject, body, and recipientEmail fields.
 */
export async function searchEmails(
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<{ data: Array<Record<string, unknown>>; total: number }> {
  try {
    const from = (page - 1) * limit;

    const result = await esClient.search({
      index: EMAIL_INDEX,
      body: {
        from,
        size: limit,
        query: {
          multi_match: {
            query,
            fields: ["subject", "body", "recipientEmail"],
            fuzziness: "AUTO",
          },
        },
        sort: [{ createdAt: { order: "desc" } }],
      },
    });

    const hits = result.hits.hits.map((hit) => ({
      _score: hit._score,
      ...(hit._source as Record<string, unknown>),
    }));

    const total =
      typeof result.hits.total === "number"
        ? result.hits.total
        : result.hits.total?.value || 0;

    return { data: hits, total };
  } catch (err) {
    logger.error("ES search failed", { query, error: (err as Error).message });
    return { data: [], total: 0 };
  }
}
