import { getMongoDb } from "./db/client";
import type { Node, UIState, GraphSnapshot } from "@/types/graph";

interface PromptContext {
  uiState: UIState;
  graphSnapshot: GraphSnapshot;
  userMessage: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  moorchehSources?: Array<{ text: string; score: number }>;
}

/**
 * Build the user prompt with graph context for the AI orchestrator
 */
export function buildGraphPrompt(ctx: PromptContext): string {
  const { uiState, graphSnapshot, userMessage, conversationHistory, moorchehSources } =
    ctx;

  const locationStatus = uiState.activeNode ? "INSIDE_NODE" : "AT_ROOT";

  // Build context block
  const contextBlock = `## CURRENT STATE
- Root Topic: "${uiState.rootNode.title}" (${uiState.rootNode.id})
- Active Node: ${
    uiState.activeNode
      ? `"${uiState.activeNode.title}" (${uiState.activeNode.id})`
      : "ROOT (user is browsing the main topic)"
  }
- Location: ${locationStatus}

## GRAPH CONTEXT
### Root's Direct Children (${graphSnapshot.rootChildren.length} subtopics):
${
  graphSnapshot.rootChildren.length > 0
    ? graphSnapshot.rootChildren
        .map((n) => `- "${n.title}" (${n.id}): ${n.summary}`)
        .join("\n")
    : "No subtopics created yet."
}
${
  uiState.activeNode && graphSnapshot.activeAncestors
    ? `
### Ancestor Path to Active Node:
${graphSnapshot.activeAncestors.map((n) => `- "${n.title}": ${n.summary}`).join("\n")}`
    : ""
}
${
  uiState.activeNode && graphSnapshot.activeChildren
    ? `
### Children of Active Node (${graphSnapshot.activeChildren.length}):
${
  graphSnapshot.activeChildren.length > 0
    ? graphSnapshot.activeChildren
        .map((n) => `- "${n.title}" (${n.id}): ${n.summary}`)
        .join("\n")
    : "No subtopics under this node yet."
}`
    : ""
}`;

  // Build conversation history block (last 3 exchanges)
  const historyBlock =
    conversationHistory && conversationHistory.length > 0
      ? `\n## RECENT CONVERSATION
${conversationHistory
  .slice(-6) // Last 3 exchanges (user + assistant pairs)
  .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 500)}${m.content.length > 500 ? "..." : ""}`)
  .join("\n")}`
      : "";

  // Build Moorcheh sources block if available
  const sourcesBlock =
    moorchehSources && moorchehSources.length > 0
      ? `\n## RELEVANT KNOWLEDGE BASE CONTENT (from Moorcheh)
${moorchehSources.map((s, i) => `[${i + 1}] (score: ${s.score.toFixed(2)}) ${s.text.slice(0, 300)}...`).join("\n")}`
      : "";

  return `${contextBlock}${historyBlock}${sourcesBlock}

## USER MESSAGE
${userMessage}

---
Respond with the JSON format specified in your instructions. Remember to:
1. Search for existing nodes before creating new ones
2. Generate clear summaries for any new nodes
3. Include the activation_path for UI animations
4. Keep your teaching response helpful and engaging`;
}

/**
 * Get current UI state from database
 */
export async function getUIState(
  rootNodeId: string,
  activeNodeId: string | null
): Promise<UIState> {
  const db = await getMongoDb();

  // Get root node
  const rootNode = await db.collection<Node>("nodes").findOne({ id: rootNodeId });

  if (!rootNode) {
    throw new Error(`Root node ${rootNodeId} not found`);
  }

  // Get active node if specified
  let activeNode = null;
  if (activeNodeId && activeNodeId !== rootNodeId) {
    const node = await db.collection<Node>("nodes").findOne({ id: activeNodeId });
    if (node) {
      activeNode = { id: node.id, title: node.title };
    }
  }

  return {
    rootNode: { id: rootNode.id, title: rootNode.title },
    activeNode,
  };
}

/**
 * Get graph snapshot for context
 */
export async function getGraphSnapshot(
  rootNodeId: string,
  activeNodeId: string | null
): Promise<GraphSnapshot> {
  const db = await getMongoDb();

  // Get root's direct children
  const rootChildren = await db
    .collection<Node>("nodes")
    .find({ parent_id: rootNodeId })
    .project({ id: 1, title: 1, summary: 1 })
    .limit(20) // Limit for performance
    .toArray();

  const snapshot: GraphSnapshot = {
    rootChildren: rootChildren.map((n) => ({
      id: n.id,
      title: n.title,
      summary: n.summary || "",
    })),
  };

  // If user is inside a specific node, get ancestors and children
  if (activeNodeId && activeNodeId !== rootNodeId) {
    const activeNode = await db
      .collection<Node>("nodes")
      .findOne({ id: activeNodeId });

    if (activeNode) {
      // Get ancestors (exclude the active node itself)
      const ancestorIds = activeNode.ancestor_path.slice(0, -1);
      if (ancestorIds.length > 0) {
        const ancestors = await db
          .collection<Node>("nodes")
          .find({ id: { $in: ancestorIds } })
          .project({ id: 1, title: 1, summary: 1 })
          .toArray();

        // Sort ancestors in path order
        snapshot.activeAncestors = ancestorIds.map((id) => {
          const node = ancestors.find((n) => n.id === id);
          return {
            id: node?.id || id,
            title: node?.title || "",
            summary: node?.summary || "",
          };
        });
      }

      // Get children of active node
      if (activeNode.children_ids.length > 0) {
        const children = await db
          .collection<Node>("nodes")
          .find({ id: { $in: activeNode.children_ids } })
          .project({ id: 1, title: 1, summary: 1 })
          .toArray();

        snapshot.activeChildren = children.map((n) => ({
          id: n.id,
          title: n.title,
          summary: n.summary || "",
        }));
      } else {
        snapshot.activeChildren = [];
      }
    }
  }

  return snapshot;
}

/**
 * Helper to format node for display
 */
export function formatNodeForPrompt(node: {
  id: string;
  title: string;
  summary: string;
}): string {
  return `"${node.title}" (${node.id}): ${node.summary}`;
}
