import { getMongoDb, vectorSearch } from "./db/client";
import { generateEmbedding, createNodeEmbedding } from "./embeddings";
import type { Node, RootTopic, SearchResult } from "@/types/graph";

// Thresholds for matching decisions
export const EXACT_THRESHOLD = 0.85;
export const RELATED_THRESHOLD = 0.65;

/**
 * Graph manipulation utilities for AI orchestration
 * Uses MongoDB Atlas Vector Search + Google text-embedding-004
 */

/**
 * Search for existing nodes by semantic similarity
 */
export async function searchNodes(
  query: string,
  rootId: string,
  topK: number = 5
): Promise<{ results: SearchResult[]; message?: string }> {
  const db = await getMongoDb();

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Use MongoDB Atlas Vector Search
  const searchResults = await vectorSearch(queryEmbedding, rootId, topK);

  if (searchResults.length === 0) {
    return { results: [], message: "No matching nodes found" };
  }

  const results: SearchResult[] = searchResults.map((result: any) => ({
    id: result.id,
    title: result.title || "",
    summary: result.summary || "",
    parent_id: result.parent_id || null,
    score: result.score,
    tags: result.tags || [],
  }));

  return { results };
}

/**
 * Get full details of a specific node by ID
 */
export async function getNode(nodeId: string): Promise<{
  id: string;
  title: string;
  summary: string;
  parent_id: string | null;
  tags: string[];
  children: Array<{ id: string; title: string; summary: string }>;
  ancestor_path: string[];
} | { error: string }> {
  const db = await getMongoDb();
  const node = await db.collection<Node>("nodes").findOne({ id: nodeId });

  if (!node) {
    return { error: `Node ${nodeId} not found` };
  }

  // Get children details
  const children = await db
    .collection<Node>("nodes")
    .find({ id: { $in: node.children_ids } })
    .project({ id: 1, title: 1, summary: 1 })
    .toArray();

  return {
    id: node.id,
    title: node.title,
    summary: node.summary,
    parent_id: node.parent_id,
    tags: node.tags,
    children: children.map((c) => ({
      id: c.id,
      title: c.title,
      summary: c.summary,
    })),
    ancestor_path: node.ancestor_path,
  };
}

/**
 * Get the ordered path from root to a node (for UI animation)
 */
export async function getPathToRoot(
  nodeId: string
): Promise<{ path: string[]; error?: string }> {
  const db = await getMongoDb();
  const node = await db.collection<Node>("nodes").findOne({ id: nodeId });

  if (!node) {
    return { error: `Node ${nodeId} not found`, path: [] };
  }

  return { path: node.ancestor_path };
}

/**
 * Create a new subtopic node under a parent
 */
export async function createNode(params: {
  title: string;
  summary: string;
  parent_id: string;
  tags?: string[];
}): Promise<{
  created: boolean;
  id: string;
  title: string;
  summary: string;
  parent_id: string;
  ancestor_path: string[];
} | { error: string }> {
  const { title, summary, parent_id, tags } = params;
  const db = await getMongoDb();

  // Get parent node
  const parent = await db.collection<Node>("nodes").findOne({ id: parent_id });

  if (!parent) {
    return { error: `Parent node ${parent_id} not found` };
  }

  const nodeId = crypto.randomUUID();

  // Generate embedding using Google text-embedding-004
  const embedding = await createNodeEmbedding(title, summary);

  // Create node in MongoDB with embedding for vector search
  const node: Omit<Node, "_id"> = {
    id: nodeId,
    title,
    summary,
    parent_id,
    root_id: parent.root_id,
    tags: tags || [],
    embedding,
    interaction_count: 0,
    last_refined_at: new Date(),
    created_at: new Date(),
    children_ids: [],
    ancestor_path: [...parent.ancestor_path, nodeId],
  };

  await db.collection("nodes").insertOne(node);

  // Update parent's children list
  await db
    .collection("nodes")
    .updateOne({ id: parent_id }, { $push: { children_ids: nodeId } as any });

  // Increment root topic node count
  await db
    .collection("root_topics")
    .updateOne({ id: parent.root_id }, { $inc: { node_count: 1 } });

  return {
    created: true,
    id: node.id,
    title: node.title,
    summary: node.summary,
    parent_id: node.parent_id!,
    ancestor_path: node.ancestor_path,
  };
}

/**
 * Get node details for setting as active
 */
export async function setActiveNode(
  nodeId: string
): Promise<{
  active_node_id: string;
  title: string;
  ancestor_path: string[];
} | { error: string }> {
  const db = await getMongoDb();
  const node = await db.collection<Node>("nodes").findOne({ id: nodeId });

  if (!node) {
    return { error: `Node ${nodeId} not found` };
  }

  return {
    active_node_id: nodeId,
    title: node.title,
    ancestor_path: node.ancestor_path,
  };
}

/**
 * Search the web using Tavily API
 */
export async function webSearch(
  query: string,
  numResults: number = 3
): Promise<{
  answer?: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
    score: number;
  }>;
  error?: string;
}> {
  if (!process.env.TAVILY_API_KEY) {
    return {
      error: "Web search not configured",
      results: [],
    };
  }

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query,
        max_results: Math.min(numResults, 5),
        search_depth: "basic",
        include_answer: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      answer: data.answer || undefined,
      results: (data.results || []).map((r: any) => ({
        title: r.title,
        url: r.url,
        snippet: r.content,
        score: r.score,
      })),
    };
  } catch (error) {
    console.error("Web search error:", error);
    return {
      error: "Web search failed",
      results: [],
    };
  }
}

/**
 * Check similarity thresholds and return match type
 */
export function getMatchType(
  score: number
): "exact" | "related" | "none" {
  if (score >= EXACT_THRESHOLD) return "exact";
  if (score >= RELATED_THRESHOLD) return "related";
  return "none";
}
