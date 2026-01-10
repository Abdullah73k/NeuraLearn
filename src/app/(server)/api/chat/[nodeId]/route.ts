import { streamText, UIMessage, convertToModelMessages } from "ai";
import { google } from "@ai-sdk/google";
import { Edge } from "@xyflow/react";
import { getMongoDb, vectorSearch } from "@/lib/db/client";
import { generateEmbedding } from "@/lib/embeddings";
import { getUIState, getGraphSnapshot, buildGraphPrompt } from "@/lib/prompt-builder";
import { graphOrchestratorSystemPrompt } from "@/app/(server)/_relation-prompts/graph-orchestrator";
import { backgroundPrompt } from "@/app/(server)/_relation-prompts/background";
import type { Node } from "@/types/graph";

export const maxDuration = 60;

export async function POST(
	req: Request,
	{ params }: { params: Promise<{ nodeId: string }> }
) {
	const {
		messages,
		model,
		webSearch,
		edges,
	}: {
		messages: UIMessage[];
		model: string;
		webSearch: boolean;
		edges: Edge[];
	} = await req.json();
	const { nodeId } = await params;

	const db = await getMongoDb();
	
	// Get the active node to determine context
	const activeNode = await db.collection<Node>("nodes").findOne({ id: nodeId });
	
	if (!activeNode) {
		return new Response(
			JSON.stringify({ error: "Node not found" }),
			{ status: 404 }
		);
	}

	const rootNodeId = activeNode.root_id;

	// Build graph context for the AI
	const uiState = await getUIState(rootNodeId, nodeId);
	const graphSnapshot = await getGraphSnapshot(rootNodeId, nodeId);

	// Convert messages to get the latest user message
	const convertedMessages = convertToModelMessages(messages);
	const lastUserMessage = convertedMessages
		.filter((m) => m.role === "user")
		.pop()?.content?.toString() || "";

	// Build the context-aware prompt
	const contextPrompt = buildGraphPrompt({
		uiState,
		graphSnapshot,
		userMessage: lastUserMessage,
		conversationHistory: convertedMessages.slice(-6).map((m) => ({
			role: m.role,
			content: m.content?.toString() || "",
		})),
	});

	// Determine system prompt based on whether we're at root or inside a node
	const systemPrompt = nodeId === rootNodeId
		? graphOrchestratorSystemPrompt
		: `${backgroundPrompt}\n\n${graphOrchestratorSystemPrompt}`;

	// Build tools configuration
	const tools: any = webSearch ? {
		google_search: google.tools.googleSearch({}),
	} : undefined;

	const result = streamText({
		model: google(model),
		messages: [
			{ role: "user", content: contextPrompt },
			...convertedMessages,
		],
		system: systemPrompt,
		tools,
	});

	return result.toUIMessageStreamResponse({
		sendSources: true,
		sendReasoning: true,
	});
}
