import { streamText, UIMessage, convertToModelMessages } from "ai";
import { google } from "@ai-sdk/google";
import { Edge } from "@xyflow/react";
// Allow streaming responses up to 30 seconds
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
	console.log("nodeId: ", nodeId);
	console.log("edges: ", edges);
	const result = streamText({
		model: google(model),
		messages: convertToModelMessages(messages),
		tools: {
			google_search: google.tools.googleSearch({}),
		},
		system: webSearch
			? "You are a helpful assistant that can answer questions and help with tasks" // Add web search system prompt
			: "You are a helpful assistant that can answer questions and help with tasks",
	});
	// send sources and reasoning back to the client
	return result.toUIMessageStreamResponse({
		sendSources: true,
		sendReasoning: true,
	});
}
