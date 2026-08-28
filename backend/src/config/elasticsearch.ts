import { Client } from "@elastic/elasticsearch";
import { env } from "./env";

/**
 * Elasticsearch client — used for indexing and searching sent emails.
 * All ES operations are async/best-effort and never block email sending.
 */
export const esClient = new Client({
  node: env.ELASTICSEARCH_URL,
});

/** Index name for email documents */
export const EMAIL_INDEX = "emails";
