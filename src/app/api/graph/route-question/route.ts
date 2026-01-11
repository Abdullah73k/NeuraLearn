import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { getMongoDb } from "@/lib/db/client";
import { createNode } from "@/lib/graph-tools";
import type { Node } from "@/types/graph";

type RoutingDecision = {
    action: "use_existing" | "create_new";
    reasoning: string;
    existingNodeId?: string;
    parentNodeId?: string;
    suggestedTitle?: string;
    suggestedSummary?: string;
};

export async function POST(req: Request) {
    try {
        const { question, rootId } = await req.json();

        if (!question || !rootId) {
            return Response.json(
                { error: "Missing question or rootId" },
                { status: 400 }
            );
        }

        const db = await getMongoDb();

        // Get all nodes in this workspace with their summaries and titles
        const nodes = await db
            .collection<Node>("nodes")
            .find({ root_id: rootId })
            .project({ id: 1, title: 1, summary: 1, parent_id: 1 })
            .toArray();

        if (nodes.length === 0) {
            return Response.json(
                { error: "No nodes found in workspace" },
                { status: 404 }
            );
        }

        // Build context about the knowledge graph
        const nodeDescriptions = nodes.map((node) => {
            const description = node.summary || `Topic: ${node.title}`;
            const isRoot = node.parent_id === null;
            return `- Node ID: ${node.id}
  Title: "${node.title}"
  ${node.summary ? `Summary: ${node.summary}` : "(No summary yet - this node hasn't been explored)"}
  Type: ${isRoot ? "ROOT NODE" : "Subtopic"}`;
        }).join("\n\n");

        // Use AI to determine the best routing
        const result = await generateObject({
            model: google("gemini-2.0-flash"),
            schema: z.object({
                action: z.enum(["use_existing", "create_new"]),
                reasoning: z.string(),
                existingNodeId: z.string().optional(),
                parentNodeId: z.string().optional(),
                suggestedTitle: z.string().optional(),
                suggestedSummary: z.string().optional(),
            }) as any,
            prompt: `You are an intelligent routing system for a knowledge graph. Your job is to help users navigate their personal knowledge base efficiently.

## Available Nodes in the Knowledge Graph:
${nodeDescriptions}

## User's Question:
"${question}"

## Routing Rules:
1. **USE EXISTING NODE** if:
   - There's a node whose summary/title is DIRECTLY relevant to the question
   - The question is asking about something already covered or clearly within that node's scope
   - Example: Question "What is LeBron's jersey number?" → Route to "Los Angeles Lakers" node if it exists and discusses Lakers players

2. **CREATE NEW NODE** if:
   - The question is about a subtopic that deserves its own dedicated space
   - There's a relevant PARENT node, but the specific topic needs its own node
   - Example: Question "Tell me about Stephen Curry" when "NBA" exists but no Warriors/Curry node → Create "Stephen Curry" or "Golden State Warriors" under "NBA"
   
3. **For new nodes**, always:
   - Pick the MOST RELEVANT parent (use summaries to determine relevance)
   - If the question is completely unrelated to all existing nodes, use the ROOT node as parent
   - Suggest a clear, concise title (3-5 words)
   - Suggest a brief initial summary

## Important:
- Prioritize summaries over titles when determining relevance
- Nodes without summaries are unexplored - they might still be relevant based on title
- Think about the knowledge hierarchy - place new nodes where they logically belong
- Don't create duplicate nodes if an existing one covers the topic

Make your routing decision:`,
        });

        const decision = result.object as RoutingDecision;

        // If creating a new node, actually create it
        if (decision.action === "create_new" && decision.parentNodeId && decision.suggestedTitle) {
            const newNode = await createNode({
                title: decision.suggestedTitle,
                summary: decision.suggestedSummary || `Exploring: ${decision.suggestedTitle}`,
                parent_id: decision.parentNodeId,
            });

            if ("error" in newNode) {
                return Response.json(
                    { error: newNode.error },
                    { status: 500 }
                );
            }

            return Response.json({
                action: "navigate_to_new",
                nodeId: newNode.id,
                nodeTitle: newNode.title,
                parentId: decision.parentNodeId,
                reasoning: decision.reasoning,
                question, // Pass back to be added to chat
            });
        }

        // Route to existing node
        if (decision.action === "use_existing" && decision.existingNodeId) {
            // Verify the node exists
            const existingNode = nodes.find(n => n.id === decision.existingNodeId);
            if (!existingNode) {
                return Response.json(
                    { error: "Suggested node not found" },
                    { status: 404 }
                );
            }

            return Response.json({
                action: "navigate_to_existing",
                nodeId: decision.existingNodeId,
                nodeTitle: existingNode.title,
                reasoning: decision.reasoning,
                question, // Pass back to be added to chat
            });
        }

        return Response.json(
            { error: "Invalid routing decision" },
            { status: 500 }
        );

    } catch (error: any) {
        console.error("Routing error:", error);
        return Response.json(
            { error: error.message || "Failed to route question" },
            { status: 500 }
        );
    }
}
