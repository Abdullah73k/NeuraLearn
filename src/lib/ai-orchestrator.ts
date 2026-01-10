import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { buildGraphPrompt, getUIState, getGraphSnapshot } from "./prompt-builder";
import { graphOrchestratorSystemPrompt } from "@/app/(server)/_relation-prompts/graph-orchestrator";
import { getMongoDb, vectorSearch } from "./db/client";
import { generateEmbedding, createNodeEmbedding } from "./embeddings";
import type { ChatRequest, ChatResponse, Node, RootTopic } from "@/types/graph";

// Initialize Google AI client
const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY || ""
);

// Tool definitions for Gemini
const tools = [
  {
    functionDeclarations: [
      {
        name: "search_nodes",
        description: `Search for existing nodes by semantic similarity. Returns nodes with scores (0-1).
Score >= 0.85: Exact match, activate this node
Score >= 0.65: Related topic, create under this node  
Score < 0.65: Not related, create under root`,
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            query: {
              type: SchemaType.STRING,
              description: "Topic to search for",
            },
            top_k: {
              type: SchemaType.NUMBER,
              description: "Number of results (default 5)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_node",
        description: "Get full details of a node including its children",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            node_id: {
              type: SchemaType.STRING,
              description: "Node ID to retrieve",
            },
          },
          required: ["node_id"],
        },
      },
      {
        name: "get_path_to_root",
        description: "Get ordered path from root to node for UI animation",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            node_id: {
              type: SchemaType.STRING,
              description: "Target node ID",
            },
          },
          required: ["node_id"],
        },
      },
      {
        name: "create_node",
        description:
          "Create a new subtopic node with a clear 1-2 sentence summary",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            title: {
              type: SchemaType.STRING,
              description: "Short topic name (max 50 chars)",
            },
            summary: {
              type: SchemaType.STRING,
              description:
                "1-2 sentence student-friendly explanation (20-200 chars)",
            },
            parent_id: {
              type: SchemaType.STRING,
              description: "Parent node ID",
            },
            tags: {
              type: SchemaType.ARRAY,
              items: { type: SchemaType.STRING },
              description: "Keywords for searchability",
            },
          },
          required: ["title", "summary", "parent_id"],
        },
      },
      {
        name: "set_active_node",
        description: "Switch user's active context to a different node",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            node_id: {
              type: SchemaType.STRING,
              description: "Node ID to activate",
            },
          },
          required: ["node_id"],
        },
      },
    ],
  },
];

/**
 * Execute a tool call from Gemini
 */
async function executeTool(
  name: string,
  args: Record<string, any>,
  context: { rootNodeId: string }
): Promise<any> {
  const db = await getMongoDb();

  switch (name) {
    case "search_nodes": {
      // Generate embedding for the query
      const queryEmbedding = await generateEmbedding(args.query);

      // Use MongoDB Atlas Vector Search
      const searchResults = await vectorSearch(
        queryEmbedding,
        context.rootNodeId,
        args.top_k || 5
      );

      return {
        results: searchResults.map((result: any) => ({
          id: result.id,
          title: result.title || "",
          summary: result.summary || "",
          parent_id: result.parent_id || null,
          score: result.score,
          tags: result.tags || [],
        })),
      };
    }

    case "get_node": {
      const node = await db
        .collection<Node>("nodes")
        .findOne({ id: args.node_id });

      if (!node) {
        return { error: `Node ${args.node_id} not found` };
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
        .findOne({ id: args.node_id });

      if (!node) {
        return { error: `Node ${args.node_id} not found`, path: [] };
      }

      return { path: node.ancestor_path };
    }

    case "create_node": {
      const parent = await db
        .collection<Node>("nodes")
        .findOne({ id: args.parent_id });

      if (!parent) {
        return { error: `Parent ${args.parent_id} not found` };
      }

      const nodeId = crypto.randomUUID();

      // Generate embedding using Google text-embedding-004
      const embedding = await createNodeEmbedding(args.title, args.summary);

      // Create in MongoDB with embedding
      const node: Omit<Node, "_id"> = {
        id: nodeId,
        title: args.title,
        summary: args.summary,
        parent_id: args.parent_id,
        root_id: parent.root_id,
        tags: args.tags || [],
        embedding,
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
        .updateOne(
          { id: args.parent_id },
          { $push: { children_ids: nodeId } as any }
        );

      // Update root topic count
      await db
        .collection("root_topics")
        .updateOne({ id: parent.root_id }, { $inc: { node_count: 1 } });

      return {
        created: true,
        id: nodeId,
        title: args.title,
        summary: args.summary,
        parent_id: args.parent_id,
        ancestor_path: node.ancestor_path,
      };
    }

    case "set_active_node": {
      const node = await db
        .collection<Node>("nodes")
        .findOne({ id: args.node_id });

      if (!node) {
        return { error: `Node ${args.node_id} not found` };
      }

      return {
        active_node_id: args.node_id,
        title: node.title,
        ancestor_path: node.ancestor_path,
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

/**
 * Main orchestrator function using Gemini
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

  // 3. Initialize Gemini model with tools
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: graphOrchestratorSystemPrompt,
    tools: tools as any,
  });

  // 4. Start chat and send initial message
  const chat = model.startChat({
    history: [],
  });

  let response = await chat.sendMessage(userPrompt);
  let result = response.response;

  // 5. Handle tool calls in a loop
  while (result.functionCalls() && result.functionCalls()!.length > 0) {
    const functionCalls = result.functionCalls()!;
    const functionResponses = [];

    for (const call of functionCalls) {
      const toolResult = await executeTool(call.name, call.args as Record<string, any>, {
        rootNodeId: req.rootNodeId,
      });

      functionResponses.push({
        functionResponse: {
          name: call.name,
          response: toolResult,
        },
      });
    }

    // Send tool results back
    response = await chat.sendMessage(functionResponses);
    result = response.response;
  }

  // 6. Parse final response
  const textContent = result.text();

  if (!textContent) {
    throw new Error("No text response from Gemini");
  }

  // Try to parse JSON from response
  let decision: ChatResponse;
  try {
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      decision = {
        action: parsed.action || "none",
        targetNodeId:
          parsed.target_node_id || req.activeNodeId || req.rootNodeId,
        activationPath: parsed.activation_path || [req.rootNodeId],
        response: parsed.response || textContent,
        newNode: parsed.new_node,
        sources: parsed.sources,
      };
    } else {
      // Fallback: no JSON found, use text as response
      decision = {
        action: "none",
        targetNodeId: req.activeNodeId || req.rootNodeId,
        activationPath: [req.rootNodeId],
        response: textContent,
      };
    }
  } catch (error) {
    // JSON parse failed, use text as response
    decision = {
      action: "none",
      targetNodeId: req.activeNodeId || req.rootNodeId,
      activationPath: [req.rootNodeId],
      response: textContent,
    };
  }

  // 7. Track interaction
  await trackNodeInteraction(decision.targetNodeId, {
    userMessage: req.userMessage,
    aiResponse: decision.response,
  });

  // 8. Check if summary needs refinement
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
    if (
      !node ||
      node.interaction_count % 5 !== 0 ||
      node.interaction_count === 0
    ) {
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

    // Update summary in MongoDB
    await db.collection("nodes").updateOne(
      { id: nodeId },
      {
        $set: {
          summary: refinedSummary,
          last_refined_at: new Date(),
        },
      }
    );

    // Re-generate embedding for updated summary
    const newEmbedding = await createNodeEmbedding(node.title, refinedSummary);
    await db.collection("nodes").updateOne(
      { id: nodeId },
      {
        $set: { embedding: newEmbedding },
      }
    );

    return true;
  } catch (error) {
    console.error("Summary refinement check failed:", error);
    return false;
  }
}
