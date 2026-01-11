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
                reasoning: z.string().max(200),
                existingNodeId: z.string().optional(),
                parentNodeId: z.string().optional(),
                suggestedTitle: z.string().max(50).optional(),
                suggestedSummary: z.string().max(150).optional(),
            }) as any,
            prompt: `You are a routing system for a knowledge graph. Route user questions to the right place.

## Available Nodes:
${nodeDescriptions}

## User's Question:
"${question}"

## Decision Logic:

**USE EXISTING NODE** (action: "use_existing") ONLY when:
- The question is asking for MORE INFO about something ALREADY discussed in that node's summary
- Example: If "Lakers" node summary mentions "LeBron scored 40 points", and user asks "How many points did LeBron score?" → use_existing

**CREATE NEW NODE** (action: "create_new") when:
- The question is about a NEW TOPIC, PERSON, or CONCEPT not yet covered
- Questions like "Who is [person]?" or "What is [concept]?" almost ALWAYS need a new node
- Find the most SEMANTICALLY RELATED parent node

## Examples:
- "Who is LeBron James?" + node "LA Lakers" exists → CREATE "LeBron James" under "LA Lakers" (he plays for Lakers)
- "Who is Giannis?" + node "Milwaukee Bucks" exists → CREATE "Giannis Antetokounmpo" under "Milwaukee Bucks" (he plays for Bucks)
- "What is the chain rule?" + node "Calculus" exists → CREATE "Chain Rule" under "Calculus"
- "Tell me more about derivatives" + node "Derivatives" exists with relevant summary → USE EXISTING "Derivatives"

## CRITICAL:
- For "Who is X?" questions about people → ALWAYS create_new (people deserve their own nodes)
- Pick the parent that is most SEMANTICALLY related, not just the root
- suggestedTitle: MAX 3-4 words (person's name or concept name)

Respond with your routing decision:`,
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
