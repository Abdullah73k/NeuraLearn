import axios, { AxiosInstance } from "axios";

interface MoorchehConfig {
  apiKey: string;
  baseUrl: string;
}

interface IngestResult {
  document_id: string;
  chunk_ids: string[];
}

interface MoorchehSearchResult {
  node_id: string;
  title: string;
  score: number;
  text: string;
  chunk_id: string;
}

export class MoorchehClient {
  private client: AxiosInstance;

  constructor(config: MoorchehConfig) {
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });
  }

  /**
   * Create a new collection for a root topic
   * Each root topic gets its own Moorcheh collection for isolated search
   */
  async createCollection(name: string): Promise<string> {
    try {
      const response = await this.client.post("/collections", { name });
      return response.data.collection_id;
    } catch (error) {
      console.error("Moorcheh createCollection error:", error);
      // For hackathon: return a mock ID if API fails
      return `mock_collection_${Date.now()}`;
    }
  }

  /**
   * Ingest node content into Moorcheh for semantic search
   * Creates binarized embeddings automatically via Moorcheh's pipeline
   */
  async ingestNodeContent(
    collectionId: string,
    nodeId: string,
    content: { title: string; summary: string; fullContent?: string }
  ): Promise<IngestResult> {
    const document = [
      `# ${content.title}`,
      "",
      content.summary,
      "",
      content.fullContent || "",
    ]
      .join("\n")
      .trim();

    try {
      const response = await this.client.post(
        `/collections/${collectionId}/documents`,
        {
          document_id: nodeId,
          text: document,
          metadata: {
            node_id: nodeId,
            title: content.title,
            type: "node",
          },
        }
      );

      return {
        document_id: response.data.document_id || nodeId,
        chunk_ids: response.data.chunk_ids || [],
      };
    } catch (error) {
      console.error("Moorcheh ingestNodeContent error:", error);
      // For hackathon: return mock data if API fails
      return {
        document_id: nodeId,
        chunk_ids: [],
      };
    }
  }

  /**
   * Search for relevant nodes using Moorcheh's binary embeddings
   * This is optimized for speed (32x compression with binary vectors)
   */
  async searchNodes(
    collectionId: string,
    query: string,
    topK: number = 5
  ): Promise<MoorchehSearchResult[]> {
    try {
      const response = await this.client.post(
        `/collections/${collectionId}/search`,
        {
          query,
          top_k: topK,
          include_metadata: true,
        }
      );

      return (response.data.results || []).map((result: any) => ({
        node_id: result.metadata?.node_id || result.document_id,
        title: result.metadata?.title || "Untitled",
        score: result.score || 0,
        text: result.text || "",
        chunk_id: result.chunk_id || "",
      }));
    } catch (error) {
      console.error("Moorcheh searchNodes error:", error);
      // Return empty results on error
      return [];
    }
  }

  /**
   * Update node content when summary is refined
   */
  async updateNodeContent(
    collectionId: string,
    documentId: string,
    newContent: string
  ): Promise<void> {
    try {
      await this.client.put(
        `/collections/${collectionId}/documents/${documentId}`,
        { text: newContent }
      );
    } catch (error) {
      console.error("Moorcheh updateNodeContent error:", error);
    }
  }

  /**
   * Delete a document from the collection
   */
  async deleteDocument(
    collectionId: string,
    documentId: string
  ): Promise<void> {
    try {
      await this.client.delete(
        `/collections/${collectionId}/documents/${documentId}`
      );
    } catch (error) {
      console.error("Moorcheh deleteDocument error:", error);
    }
  }

  /**
   * Check if the Moorcheh service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get("/health");
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
let moorchehInstance: MoorchehClient | null = null;

export function getMoorchehClient(): MoorchehClient {
  if (!moorchehInstance) {
    moorchehInstance = new MoorchehClient({
      apiKey: process.env.MOORCHEH_API_KEY || "",
      baseUrl: process.env.MOORCHEH_BASE_URL || "https://api.moorcheh.ai",
    });
  }
  return moorchehInstance;
}

// Export default instance for convenience
export const moorcheh = {
  get client() {
    return getMoorchehClient();
  },
  createCollection: (name: string) => getMoorchehClient().createCollection(name),
  ingestNodeContent: (
    collectionId: string,
    nodeId: string,
    content: { title: string; summary: string; fullContent?: string }
  ) => getMoorchehClient().ingestNodeContent(collectionId, nodeId, content),
  searchNodes: (collectionId: string, query: string, topK?: number) =>
    getMoorchehClient().searchNodes(collectionId, query, topK),
  updateNodeContent: (
    collectionId: string,
    documentId: string,
    newContent: string
  ) => getMoorchehClient().updateNodeContent(collectionId, documentId, newContent),
  deleteDocument: (collectionId: string, documentId: string) =>
    getMoorchehClient().deleteDocument(collectionId, documentId),
  healthCheck: () => getMoorchehClient().healthCheck(),
};
