import { tool } from "ai";
import { z } from "zod";
import { moorcheh } from "./moorcheh/client";
import { getMongoDb } from "./db/client";
import type { Node, RootTopic, SearchResult } from "@/types/graph";

// Thresholds for matching decisions
export const EXACT_THRESHOLD = 0.85;
export const RELATED_THRESHOLD = 0.65;

/**
 * Graph manipulation tools for AI orchestration
 * These tools allow the AI to search, create, and navigate the knowledge graph
 */

export const searchNodesTool = tool({
  description: `Search for existing nodes by semantic similarity using Moorcheh's binary embeddings.
Use this to check if a topic already exists before creating a new node.
Returns nodes with similarity scores (0-1).
- Score >= 0.85: Exact match, activate this node
- Score >= 0.65: Related topic, create new node under this one
- Score < 0.65: Not related, create under root`,
  parameters: z.object({
    query: z.string().describe("The topic/concept to search for"),
    top_k: z.number().default(5).describe("Number of results to return"),
  }),
  execute: async ({ query, top_k }) => {
    const db = await getMongoDb();

    // Get root node ID from the most recent context
    // In production, this would come from session context
    const rootTopics = await db
      .collection<RootTopic>("root_topics")
      .find({})
      .sort({ created_at: -1 })
      .limit(1)
      .toArray();

    if (rootTopics.length === 0) {
      return { results: [], message: "No root topic found" };
    }

    const rootTopic = rootTopics[0];

    // Use Moorcheh for semantic search
    const moorchehResults = await moorcheh.searchNodes(
      rootTopic.moorcheh_collection_id,
      query,
      top_k
    );

    if (moorchehResults.length === 0) {
      return { results: [], message: "No matching nodes found" };
    }

    // Enrich with MongoDB metadata
    const nodeIds = moorchehResults.map((r) => r.node_id);
    const nodes = await db
      .collection<Node>("nodes")
      .find({ id: { $in: nodeIds } })
      .toArray();

    const results: SearchResult[] = moorchehResults.map((result) => {
      const node = nodes.find((n) => n.id === result.node_id);
      return {
        id: node?.id || result.node_id,
        title: node?.title || result.title,
        summary: node?.summary || "",
        parent_id: node?.parent_id || null,
        score: result.score,
        tags: node?.tags || [],
      };
    });

    return { results };
  },
});

export const getNodeTool = tool({
  description: "Get full details of a specific node by ID, including its children",
  parameters: z.object({
    node_id: z.string().describe("Node ID to retrieve"),
  }),
  execute: async ({ node_id }) => {
    const db = await getMongoDb();
    const node = await db.collection<Node>("nodes").findOne({ id: node_id });

    if (!node) {
      return { error: `Node ${node_id} not found` };
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
  },
});

export const getPathToRootTool = tool({
  description:
    "Get the ordered path from root to a node (for UI animation). Returns array of node IDs from root → target.",
  parameters: z.object({
    node_id: z.string().describe("Target node ID"),
  }),
  execute: async ({ node_id }) => {
    const db = await getMongoDb();
    const node = await db.collection<Node>("nodes").findOne({ id: node_id });

    if (!node) {
      return { error: `Node ${node_id} not found`, path: [] };
    }

    return { path: node.ancestor_path };
  },
});

export const createNodeTool = tool({
  description: `Create a new subtopic node under a parent.
You MUST provide a clear 1-2 sentence summary that captures the essence of this topic.
The summary should be student-friendly and explain what this topic teaches.`,
  parameters: z.object({
    title: z.string().max(50).describe("Short topic name (max 50 chars)"),
    summary: z
      .string()
      .min(20)
      .max(200)
      .describe(
        "1-2 sentence explanation of this topic. Must be clear and student-friendly."
      ),
    parent_id: z.string().describe("Parent node ID to attach this node to"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Keywords for better searchability"),
  }),
  execute: async ({ title, summary, parent_id, tags }) => {
    const db = await getMongoDb();

    // Get parent node
    const parent = await db
      .collection<Node>("nodes")
      .findOne({ id: parent_id });

    if (!parent) {
      return { error: `Parent node ${parent_id} not found` };
    }

    // Get root topic for Moorcheh collection
    const rootTopic = await db
      .collection<RootTopic>("root_topics")
      .findOne({ id: parent.root_id });

    if (!rootTopic) {
      return { error: "Root topic not found" };
    }

    const nodeId = crypto.randomUUID();

    // Ingest into Moorcheh for semantic search
    const { document_id, chunk_ids } = await moorcheh.ingestNodeContent(
      rootTopic.moorcheh_collection_id,
      nodeId,
      { title, summary }
    );

    // Create node in MongoDB
    const node: Omit<Node, "_id"> = {
      id: nodeId,
      title,
      summary,
      parent_id,
      root_id: parent.root_id,
      tags: tags || [],
      moorcheh_document_id: document_id,
      moorcheh_chunk_ids: chunk_ids,
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
      .updateOne({ id: parent_id }, { $push: { children_ids: nodeId } });

    // Increment root topic node count
    await db
      .collection("root_topics")
      .updateOne({ id: parent.root_id }, { $inc: { node_count: 1 } });

    return {
      created: true,
      id: node.id,
      title: node.title,
      summary: node.summary,
      parent_id: node.parent_id,
      ancestor_path: node.ancestor_path,
    };
  },
});

export const setActiveNodeTool = tool({
  description: "Switch the user's active context to a different node",
  parameters: z.object({
    node_id: z.string().describe("Node ID to activate"),
  }),
  execute: async ({ node_id }) => {
    const db = await getMongoDb();
    const node = await db.collection<Node>("nodes").findOne({ id: node_id });

    if (!node) {
      return { error: `Node ${node_id} not found` };
    }

    return {
      active_node_id: node_id,
      title: node.title,
      ancestor_path: node.ancestor_path,
    };
  },
});

/**
 * Web search tool for current/real-time information
 */
export const webSearchTool = tool({
  description: `Search the web for current information. 
Use this ONLY when:
- User asks "what's the latest..." or "recent developments in..."
- Topic requires current data, research, or news
- You need to verify a fact you're uncertain about

DO NOT use for standard educational explanations that are well-established.`,
  parameters: z.object({
    query: z.string().describe("Search query"),
    num_results: z.number().default(3).describe("Number of results (1-5)"),
  }),
  execute: async ({ query, num_results }) => {
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
          max_results: Math.min(num_results, 5),
          search_depth: "basic",
          include_answer: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        answer: data.answer || null,
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
  },
});

/**
 * Combined tools object for easy import
 */
export const graphTools = {
  search_nodes: searchNodesTool,
  get_node: getNodeTool,
  get_path_to_root: getPathToRootTool,
  create_node: createNodeTool,
  set_active_node: setActiveNodeTool,
  web_search: webSearchTool,
};
