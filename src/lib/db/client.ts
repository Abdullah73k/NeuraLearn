import { MongoClient, Db } from "mongodb";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getMongoDb(): Promise<Db> {
  if (cachedDb) return cachedDb;

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI not defined in environment variables");
  }

  const client = new MongoClient(process.env.MONGODB_URI, {
    // Add TLS options to handle SSL connection issues
    tls: true,
    tlsAllowInvalidCertificates: false,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  
  await client.connect();

  cachedClient = client;
  cachedDb = client.db("neuralearn");

  // Create indexes for performance
  await createIndexes(cachedDb);

  return cachedDb;
}

async function createIndexes(db: Db): Promise<void> {
  try {
    // Nodes collection indexes
    await db.collection("nodes").createIndex({ id: 1 }, { unique: true });
    await db.collection("nodes").createIndex({ root_id: 1, parent_id: 1 });
    await db.collection("nodes").createIndex({ ancestor_path: 1 });
    await db.collection("nodes").createIndex({ children_ids: 1 });

    // Node interactions collection indexes
    await db
      .collection("node_interactions")
      .createIndex({ node_id: 1, timestamp: -1 });

    // Root topics collection indexes
    await db
      .collection("root_topics")
      .createIndex({ id: 1 }, { unique: true });
  } catch (error) {
    // Indexes may already exist, which is fine
    console.log("Index creation:", error instanceof Error ? error.message : "done");
  }
}

/**
 * Create MongoDB Atlas Vector Search index for nodes collection
 * 
 * IMPORTANT: This must be run ONCE via MongoDB Atlas UI or Atlas CLI
 * Go to Atlas → Your Cluster → Atlas Search → Create Search Index
 * 
 * Use this JSON definition:
 * {
 *   "mappings": {
 *     "dynamic": true,
 *     "fields": {
 *       "embedding": {
 *         "dimensions": 768,
 *         "similarity": "cosine",
 *         "type": "knnVector"
 *       }
 *     }
 *   }
 * }
 * 
 * Name the index: "vector_index"
 */
export const VECTOR_INDEX_NAME = "vector_index";

/**
 * Perform vector similarity search using MongoDB Atlas Vector Search
 */
export async function vectorSearch(
  query: number[],
  rootId: string,
  limit: number = 5
): Promise<Array<{ id: string; score: number }>> {
  const db = await getMongoDb();

  const pipeline = [
    {
      $vectorSearch: {
        index: VECTOR_INDEX_NAME,
        path: "embedding",
        queryVector: query,
        numCandidates: limit * 10,
        limit: limit,
        filter: { root_id: rootId },
      },
    },
    {
      $project: {
        id: 1,
        title: 1,
        summary: 1,
        parent_id: 1,
        tags: 1,
        score: { $meta: "vectorSearchScore" },
      },
    },
  ];

  try {
    const results = await db.collection("nodes").aggregate(pipeline).toArray();
    return results.map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      parent_id: r.parent_id,
      tags: r.tags || [],
      score: r.score,
    }));
  } catch (error) {
    console.error("Vector search failed:", error);
    // Fallback: return empty results (index might not exist yet)
    return [];
  }
}

export async function closeMongoConnection(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
}

// Helper to get typed collections
export async function getCollections() {
  const db = await getMongoDb();
  return {
    nodes: db.collection("nodes"),
    nodeInteractions: db.collection("node_interactions"),
    rootTopics: db.collection("root_topics"),
  };
}
