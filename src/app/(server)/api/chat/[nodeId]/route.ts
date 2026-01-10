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
		model: webSearch ? "perplexity/sonar" : google(model),
		messages: convertToModelMessages(messages),
		system:
			"You are a helpful assistant that can answer questions and help with tasks",
	});
	// send sources and reasoning back to the client
	return result.toUIMessageStreamResponse({
		sendSources: true,
		sendReasoning: true,
	});
}
