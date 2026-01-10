import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Google AI client
const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY || ""
);

// Embedding model - text-embedding-004 has 768 dimensions
const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

/**
 * Generate embedding for text using Google's text-embedding-004
 * Returns a 768-dimensional vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const result = await embeddingModel.embedContent(text);
    return result.embedding.values;
  } catch (error) {
    console.error("Embedding generation failed:", error);
    throw new Error("Failed to generate embedding");
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * More efficient than calling generateEmbedding multiple times
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  try {
    const results = await Promise.all(
      texts.map((text) => embeddingModel.embedContent(text))
    );
    return results.map((r) => r.embedding.values);
  } catch (error) {
    console.error("Batch embedding generation failed:", error);
    throw new Error("Failed to generate embeddings");
  }
}

/**
 * Create embedding for a node (title + summary combined)
 */
export async function createNodeEmbedding(
  title: string,
  summary: string
): Promise<number[]> {
  const text = `${title}. ${summary}`;
  return generateEmbedding(text);
}

/**
 * Calculate cosine similarity between two vectors
 * Returns value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}
