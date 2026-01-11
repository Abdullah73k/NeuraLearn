import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { getMongoDb, vectorSearch } from "@/lib/db/client";
import { generateEmbedding } from "@/lib/embeddings";
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

        // Get root node for context
        const rootNode = await db
            .collection<Node>("nodes")
            .findOne({ id: rootId, parent_id: null });

        if (!rootNode) {
            return Response.json(
                { error: "Root node not found" },
                { status: 404 }
            );
        }

        // Use vector search to find top 5 most semantically similar nodes
        const queryEmbedding = await generateEmbedding(question);
        const similarNodes = await vectorSearch(queryEmbedding, rootId, 5);

        // Always include root node + top similar nodes
        const relevantNodeIds = [rootId, ...similarNodes.map(n => n.id)];
        
        // Fetch full details for these nodes
        const nodes = await db
            .collection<Node>("nodes")
            .find({ id: { $in: relevantNodeIds } })
            .project({ id: 1, title: 1, summary: 1, parent_id: 1 })
            .toArray();

        if (nodes.length === 0) {
            return Response.json(
                { error: "No nodes found in workspace" },
                { status: 404 }
            );
        }

        // Build context about the knowledge graph with similarity scores
        const nodeDescriptions = nodes.map((node) => {
            const isRoot = node.parent_id === null;
            const similarNode = similarNodes.find(n => n.id === node.id);
            const scoreInfo = similarNode ? ` (Similarity: ${(similarNode.score * 100).toFixed(1)}%)` : " (ROOT NODE)";
            
            return `- Node ID: ${node.id}
  Title: "${node.title}"${scoreInfo}
  ${node.summary ? `Summary: ${node.summary}` : "(No summary yet - this node hasn't been explored)"}
  Type: ${isRoot ? "ROOT NODE" : "Subtopic"}`;
        }).join("\n\n");

        // Use AI to determine the best routing
        const result = await generateObject({
            model: google("gemini-2.0-flash"),
            schema: z.object({
                action: z.enum(["use_existing", "create_new"]),
                reasoning: z.string().max(300),
                existingNodeId: z.string().optional(),
                parentNodeId: z.string().optional(),
                suggestedTitle: z.string().max(50).optional(),
                suggestedSummary: z.string().max(150).optional(),
            }) as any,
            prompt: `You are a routing system for a knowledge graph. Route user questions to the right place.

## Most Relevant Nodes (via Vector Search):
${nodeDescriptions}

## User's Question:
"${question}"

## Decision Logic:

### STEP 1: Check for Existing Nodes (Prevent Duplicates)
**USE EXISTING NODE** (action: "use_existing") when:
- A node exists with **HIGH similarity (>85%)** AND similar/matching title
  - Example: Question "Who is LeBron James?" + Node "LeBron James" (92% similarity) → **use_existing**
  - Example: Question "What are derivatives?" + Node "Derivatives" (88% similarity) → **use_existing**
- The question asks for more info about something ALREADY in that node's summary
  - Example: "Lakers" node mentions "LeBron", user asks "Tell me about LeBron on the Lakers" → **use_existing** Lakers node

### STEP 2: Create New Node (Only if no duplicate exists)
**CREATE NEW NODE** (action: "create_new") when:
- **No high-similarity match exists** (<85% on all nodes)
- The question is about a NEW topic/person/concept not yet covered
- Pick the parent with **HIGHEST similarity score** (shows it's most related)
- If all similarity scores are low (<50%), create under ROOT NODE

## Examples:
**Preventing Duplicates:**
- "Who is Giannis?" + "Giannis Antetokounmpo" exists (95% similarity) → **use_existing** (not duplicate!)
- "Tell me about LeBron" + "LeBron James" exists (90% similarity) → **use_existing**
- "What is calculus?" + "Calculus" exists (88% similarity) → **use_existing**

**Creating New Nodes:**
- "Who is Damian Lillard?" + No similar nodes found (<60% on all) → **create_new** under highest match
- "What is the chain rule?" + "Calculus" (70% similarity), no "Chain Rule" node → **create_new** under "Calculus"
- "Who is Giannis?" + "Milwaukee Bucks" (80%), no "Giannis" node → **create_new** under "Milwaukee Bucks"

## CRITICAL RULES:
1. **Priority: Check similarity FIRST** - If >85% match exists with similar title → use_existing (prevents duplicates)
2. **For creating**: Pick parent with HIGHEST similarity score (unless root)
3. **suggestedTitle**: MAX 3-4 words, match existing naming style if similar node exists
4. **reasoning**: Brief and concise (max 250 chars)

Respond with your routing decision:`,
        });

        const decision = result.object as RoutingDecision;

        // If creating a new node, return the decision without creating yet
        // Frontend will create after user confirms
        if (decision.action === "create_new" && decision.parentNodeId && decision.suggestedTitle) {
            // Verify parent exists
            const parentNode = nodes.find(n => n.id === decision.parentNodeId);
            if (!parentNode) {
                return Response.json(
                    { error: "Parent node not found" },
                    { status: 404 }
                );
            }

            return Response.json({
                action: "create_new",
                parentId: decision.parentNodeId,
                suggestedTitle: decision.suggestedTitle,
                suggestedSummary: decision.suggestedSummary || `Exploring: ${decision.suggestedTitle}`,
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
