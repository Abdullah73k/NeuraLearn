import Anthropic from "@anthropic-ai/sdk";
import { buildGraphPrompt, getUIState, getGraphSnapshot } from "./prompt-builder";
import { graphOrchestratorSystemPrompt } from "@/app/(server)/_relation-prompts/graph-orchestrator";
import { getMongoDb } from "./db/client";
import { moorcheh } from "./moorcheh/client";
import type { ChatRequest, ChatResponse, Node, RootTopic } from "@/types/graph";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Tool definitions for Claude
const tools: Anthropic.Tool[] = [
  {
    name: "search_nodes",
    description: `Search for existing nodes by semantic similarity. Returns nodes with scores (0-1).
Score >= 0.85: Exact match, activate this node
Score >= 0.65: Related topic, create under this node
Score < 0.65: Not related, create under root`,
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Topic to search for" },
        top_k: { type: "number", description: "Number of results", default: 5 },
      },
      required: ["query"],
    },
  },
  {
    name: "get_node",
    description: "Get full details of a node including its children",
    input_schema: {
      type: "object",
      properties: {
        node_id: { type: "string", description: "Node ID to retrieve" },
      },
      required: ["node_id"],
    },
  },
  {
    name: "get_path_to_root",
    description: "Get ordered path from root to node for UI animation",
    input_schema: {
      type: "object",
      properties: {
        node_id: { type: "string", description: "Target node ID" },
      },
      required: ["node_id"],
    },
  },
  {
    name: "create_node",
    description: "Create a new subtopic node with a clear 1-2 sentence summary",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short topic name (max 50 chars)" },
        summary: {
          type: "string",
          description: "1-2 sentence student-friendly explanation (20-200 chars)",
        },
        parent_id: { type: "string", description: "Parent node ID" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Keywords for searchability",
        },
      },
      required: ["title", "summary", "parent_id"],
    },
  },
  {
    name: "set_active_node",
    description: "Switch user's active context to a different node",
    input_schema: {
      type: "object",
      properties: {
        node_id: { type: "string", description: "Node ID to activate" },
      },
      required: ["node_id"],
    },
  },
  {
    name: "web_search",
    description:
      "Search web for current info. Only use for latest news/research or fact verification",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
        num_results: { type: "number", description: "Results (1-5)", default: 3 },
      },
      required: ["query"],
    },
  },
];

/**
 * Execute a tool call from Claude
 */
async function executeTool(
  name: string,
  input: Record<string, any>,
  context: { rootNodeId: string }
): Promise<any> {
  const db = await getMongoDb();

  switch (name) {
    case "search_nodes": {
      const rootTopic = await db
        .collection<RootTopic>("root_topics")
        .findOne({ id: context.rootNodeId });

      if (!rootTopic) {
        return { results: [], error: "Root topic not found" };
      }

      const moorchehResults = await moorcheh.searchNodes(
        rootTopic.moorcheh_collection_id,
        input.query,
        input.top_k || 5
      );

      const nodeIds = moorchehResults.map((r) => r.node_id);
      const nodes = await db
        .collection<Node>("nodes")
        .find({ id: { $in: nodeIds } })
        .toArray();

      return {
        results: moorchehResults.map((result) => {
          const node = nodes.find((n) => n.id === result.node_id);
          return {
            id: node?.id || result.node_id,
            title: node?.title || result.title,
            summary: node?.summary || "",
            parent_id: node?.parent_id || null,
            score: result.score,
            tags: node?.tags || [],
          };
        }),
      };
    }

    case "get_node": {
      const node = await db
        .collection<Node>("nodes")
        .findOne({ id: input.node_id });

      if (!node) {
        return { error: `Node ${input.node_id} not found` };
      }

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
        children,
        ancestor_path: node.ancestor_path,
      };
    }

    case "get_path_to_root": {
      const node = await db
        .collection<Node>("nodes")
        .findOne({ id: input.node_id });

      if (!node) {
        return { error: `Node ${input.node_id} not found`, path: [] };
      }

      return { path: node.ancestor_path };
    }

    case "create_node": {
      const parent = await db
        .collection<Node>("nodes")
        .findOne({ id: input.parent_id });

      if (!parent) {
        return { error: `Parent ${input.parent_id} not found` };
      }

      const rootTopic = await db
        .collection<RootTopic>("root_topics")
        .findOne({ id: parent.root_id });

      if (!rootTopic) {
        return { error: "Root topic not found" };
      }

      const nodeId = crypto.randomUUID();

      // Ingest into Moorcheh
      const { document_id, chunk_ids } = await moorcheh.ingestNodeContent(
        rootTopic.moorcheh_collection_id,
        nodeId,
        { title: input.title, summary: input.summary }
      );

      // Create in MongoDB
      const node: Omit<Node, "_id"> = {
        id: nodeId,
        title: input.title,
        summary: input.summary,
        parent_id: input.parent_id,
        root_id: parent.root_id,
        tags: input.tags || [],
        moorcheh_document_id: document_id,
        moorcheh_chunk_ids: chunk_ids,
        interaction_count: 0,
        last_refined_at: new Date(),
        created_at: new Date(),
        children_ids: [],
        ancestor_path: [...parent.ancestor_path, nodeId],
      };

      await db.collection("nodes").insertOne(node);

      // Update parent
      await db
        .collection("nodes")
        .updateOne({ id: input.parent_id }, { $push: { children_ids: nodeId } });

      // Update root topic count
      await db
        .collection("root_topics")
        .updateOne({ id: parent.root_id }, { $inc: { node_count: 1 } });

      return {
        created: true,
        id: nodeId,
        title: input.title,
        summary: input.summary,
        parent_id: input.parent_id,
        ancestor_path: node.ancestor_path,
      };
    }

    case "set_active_node": {
      const node = await db
        .collection<Node>("nodes")
        .findOne({ id: input.node_id });

      if (!node) {
        return { error: `Node ${input.node_id} not found` };
      }

      return {
        active_node_id: input.node_id,
        title: node.title,
        ancestor_path: node.ancestor_path,
      };
    }

    case "web_search": {
      if (!process.env.TAVILY_API_KEY) {
        return { error: "Web search not configured", results: [] };
      }

      try {
        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: process.env.TAVILY_API_KEY,
            query: input.query,
            max_results: Math.min(input.num_results || 3, 5),
            search_depth: "basic",
            include_answer: true,
          }),
        });

        const data = await response.json();
        return {
          answer: data.answer,
          results: (data.results || []).map((r: any) => ({
            title: r.title,
            url: r.url,
            snippet: r.content,
          })),
        };
      } catch (error) {
        return { error: "Web search failed", results: [] };
      }
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

/**
 * Main orchestrator function
 */
export async function orchestrateGraphChat(
  req: ChatRequest
): Promise<ChatResponse> {
  // 1. Get graph context
  const uiState = await getUIState(req.rootNodeId, req.activeNodeId);
  const graphSnapshot = await getGraphSnapshot(req.rootNodeId, req.activeNodeId);

  // 2. Build prompt
  const userPrompt = buildGraphPrompt({
    uiState,
    graphSnapshot,
    userMessage: req.userMessage,
    conversationHistory: req.conversationHistory,
  });

  // 3. Initial Claude call
  let messages: Anthropic.MessageParam[] = [
    { role: "user", content: userPrompt },
  ];

  let response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: graphOrchestratorSystemPrompt,
    tools,
    messages,
  });

  // 4. Handle tool calls in a loop
  while (response.stop_reason === "tool_use") {
    const toolUseBlocks = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolUse of toolUseBlocks) {
      const result = await executeTool(
        toolUse.name,
        toolUse.input as Record<string, any>,
        { rootNodeId: req.rootNodeId }
      );

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: JSON.stringify(result),
      });
    }

    // Continue conversation with tool results
    messages = [
      ...messages,
      { role: "assistant", content: response.content },
      { role: "user", content: toolResults },
    ];

    response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: graphOrchestratorSystemPrompt,
      tools,
      messages,
    });
  }

  // 5. Parse final response
  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );

  if (!textBlock) {
    throw new Error("No text response from Claude");
  }

  // Try to parse JSON from response
  let decision: ChatResponse;
  try {
    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      decision = {
        action: parsed.action || "none",
        targetNodeId: parsed.target_node_id || req.activeNodeId || req.rootNodeId,
        activationPath: parsed.activation_path || [req.rootNodeId],
        response: parsed.response || textBlock.text,
        newNode: parsed.new_node,
        sources: parsed.sources,
      };
    } else {
      // Fallback: no JSON found, use text as response
      decision = {
        action: "none",
        targetNodeId: req.activeNodeId || req.rootNodeId,
        activationPath: [req.rootNodeId],
        response: textBlock.text,
      };
    }
  } catch (error) {
    // JSON parse failed, use text as response
    decision = {
      action: "none",
      targetNodeId: req.activeNodeId || req.rootNodeId,
      activationPath: [req.rootNodeId],
      response: textBlock.text,
    };
  }

  // 6. Track interaction
  await trackNodeInteraction(decision.targetNodeId, {
    userMessage: req.userMessage,
    aiResponse: decision.response,
  });

  // 7. Check if summary needs refinement
  const shouldRefine = await checkSummaryRefinement(decision.targetNodeId);
  if (shouldRefine) {
    decision.summaryUpdated = true;
  }

  return decision;
}

/**
 * Track node interaction in database
 */
async function trackNodeInteraction(
  nodeId: string,
  interaction: { userMessage: string; aiResponse: string }
): Promise<void> {
  try {
    const db = await getMongoDb();

    // Increment interaction count
    await db
      .collection("nodes")
      .updateOne({ id: nodeId }, { $inc: { interaction_count: 1 } });

    // Store interaction
    await db.collection("node_interactions").insertOne({
      node_id: nodeId,
      user_message: interaction.userMessage,
      ai_response: interaction.aiResponse,
      moorcheh_sources: [],
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("Failed to track interaction:", error);
  }
}

/**
 * Check if node summary should be refined based on interaction count
 */
async function checkSummaryRefinement(nodeId: string): Promise<boolean> {
  try {
    const db = await getMongoDb();
    const node = await db.collection<Node>("nodes").findOne({ id: nodeId });

    // Refine every 5 interactions
    if (!node || node.interaction_count % 5 !== 0 || node.interaction_count === 0) {
      return false;
    }

    // Get recent interactions
    const interactions = await db
      .collection("node_interactions")
      .find({ node_id: nodeId })
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    if (interactions.length < 3) {
      return false;
    }

    // Import and call refiner
    const { refineNodeSummary } = await import("./summary-refiner");

    const parent = node.parent_id
      ? await db.collection<Node>("nodes").findOne({ id: node.parent_id })
      : null;

    const refinedSummary = await refineNodeSummary(nodeId, {
      userQuestions: interactions.map((i) => i.user_message),
      aiResponses: interactions.map((i) => i.ai_response),
      nodeTitle: node.title,
      currentSummary: node.summary,
      parentSummary: parent?.summary,
    });

    // Update in MongoDB
    await db.collection("nodes").updateOne(
      { id: nodeId },
      {
        $set: {
          summary: refinedSummary,
          last_refined_at: new Date(),
        },
      }
    );

    // Update in Moorcheh
    const rootTopic = await db
      .collection<RootTopic>("root_topics")
      .findOne({ id: node.root_id });

    if (rootTopic) {
      await moorcheh.updateNodeContent(
        rootTopic.moorcheh_collection_id,
        node.moorcheh_document_id,
        `# ${node.title}\n\n${refinedSummary}`
      );
    }

    return true;
  } catch (error) {
    console.error("Summary refinement check failed:", error);
    return false;
  }
}
