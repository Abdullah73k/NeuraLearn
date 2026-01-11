import { streamText, UIMessage, convertToModelMessages, tool } from "ai";
import { google } from "@ai-sdk/google";
import { Edge } from "@xyflow/react";
import { getMongoDb } from "@/lib/db/client";
import { createNodeEmbedding } from "@/lib/embeddings";
import { createNode } from "@/lib/graph-tools";
import type { Node } from "@/types/graph";
import { z } from "zod";

// Allow streaming responses up to 60 seconds
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

    // Get current node to determine root_id for vector search
    const db = await getMongoDb();
    const currentNode = await db.collection<Node>("nodes").findOne({ id: nodeId });
    const rootId = currentNode?.root_id;

    // Build tools object
    const tools: Record<string, any> = {};

    if (webSearch) {
        tools.google_search = google.tools.googleSearch({});
    }

    const result = streamText({
        model: google(model),
        messages: convertToModelMessages(messages),
        tools: Object.keys(tools).length > 0 ? tools : undefined,
        system: "You are a helpful assistant that can answer questions and help with tasks.",
        onFinish: async ({ text }) => {
            // Update node summary and save interaction after chat completes
            try {
                const db = await getMongoDb();
                const node = await db.collection<Node>("nodes").findOne({ id: nodeId });
                
                if (!node) return;

                // Get the last user message
                const lastUserMessage = messages[messages.length - 1];
                let userMessageText = "";
                if (lastUserMessage && lastUserMessage.role === "user" && lastUserMessage.parts) {
                    const textPart = lastUserMessage.parts.find((p: any) => p.type === "text") as any;
                    userMessageText = textPart?.text || "";
                }

                // Save the interaction to node_interactions collection
                await db.collection("node_interactions").insertOne({
                    node_id: nodeId,
                    user_message: userMessageText,
                    ai_response: text,
                    timestamp: new Date(),
                });

                console.log(`Saved interaction for node ${nodeId}`);

                // Build conversation history for summary
                const conversationText = messages.map(msg => {
                    if (msg.role === "user" && msg.parts) {
                        const textPart = msg.parts.find((p: any) => p.type === "text") as any;
                        return `User: ${textPart?.text || ""}`;
                    } else if (msg.role === "assistant" && msg.parts) {
                        const textPart = msg.parts.find((p: any) => p.type === "text") as any;
                        return `Assistant: ${textPart?.text || ""}`;
                    }
                    return "";
                }).filter(Boolean).join("\n");

                const summaryPrompt = `You are summarizing a knowledge graph node titled "${node.title}".

Read this ENTIRE conversation carefully and generate a comprehensive summary that captures what was actually discussed.

IMPORTANT: Base your summary ONLY on what was discussed in the conversation below. Do NOT make assumptions based on the title alone.

Your summary should:
- Include key concepts, definitions, and explanations that were covered
- Mention specific examples, formulas, or techniques discussed
- Capture important questions asked and insights provided
- Note any relationships or connections made to other topics
- Be detailed enough to understand what was learned without reading the full conversation

Conversation:
${conversationText.substring(0, 4000)}
Assistant: ${text.substring(0, 1000)}

Write a comprehensive 3-5 sentence summary covering the main points, concepts, and examples discussed:`;

                const summaryResult = await streamText({
                    model: google(model),
                    prompt: summaryPrompt,
                });

                let summary = "";
                for await (const chunk of summaryResult.textStream) {
                    summary += chunk;
                }

                // Trim and limit length (increased to 800 characters for more detail)
                summary = summary.trim().substring(0, 800);

                if (summary) {
                    // Update the node with new summary and regenerate embedding
                    const embedding = await createNodeEmbedding(node.title, summary);
                    
                    await db.collection("nodes").updateOne(
                        { id: nodeId },
                        { 
                            $set: { 
                                summary,
                                embedding,
                                last_refined_at: new Date()
                            },
                            $inc: { interaction_count: 1 }
                        }
                    );
                    
                    console.log(`Updated summary for node ${nodeId}:`, summary);
                }
            } catch (error) {
                console.error("Failed to update node summary:", error);
            }
        }
    });

    // send sources and reasoning back to the client
    return result.toUIMessageStreamResponse({
        sendSources: true,
        sendReasoning: true,
    });
}