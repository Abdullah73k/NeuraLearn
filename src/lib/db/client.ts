import { MongoClient, Db } from "mongodb";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getMongoDb(): Promise<Db> {
  if (cachedDb) return cachedDb;

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI not defined in environment variables");
  }

  const client = new MongoClient(process.env.MONGODB_URI);
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
    await db.collection("nodes").createIndex({ moorcheh_document_id: 1 });
    await db.collection("nodes").createIndex({ children_ids: 1 });

    // Node interactions collection indexes
    await db
      .collection("node_interactions")
      .createIndex({ node_id: 1, timestamp: -1 });

    // Root topics collection indexes
    await db
      .collection("root_topics")
      .createIndex({ id: 1 }, { unique: true });
    await db
      .collection("root_topics")
      .createIndex({ moorcheh_collection_id: 1 });
  } catch (error) {
    // Indexes may already exist, which is fine
    console.log("Index creation:", error instanceof Error ? error.message : "done");
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
