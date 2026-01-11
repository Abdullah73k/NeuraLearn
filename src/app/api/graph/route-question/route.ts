import { google } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";
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
        const { question, rootId, currentNodeId, recentMessages } = await req.json();

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

        // Get current node context if user is viewing a specific node
        let currentNodeContext = "";
        let currentNode = null;
        if (currentNodeId && currentNodeId !== rootId) {
            currentNode = await db.collection<Node>("nodes").findOne({ id: currentNodeId });
            if (currentNode) {
                currentNodeContext = `\n## Current Context:\nUser is currently viewing node: "${currentNode.title}"\nSummary: ${currentNode.summary || "(No summary yet)"}\nNode ID: ${currentNode.id}\n`;
                
                // Add recent chat history for pronoun resolution
                if (recentMessages && recentMessages.length > 0) {
                    currentNodeContext += `\nRecent conversation:\n`;
                    recentMessages.forEach((msg: any, i: number) => {
                        currentNodeContext += `${msg.role}: ${msg.content}\n`;
                    });
                }
            }
        }

        // Fetch ALL nodes in the workspace first (needed for both vector search fallback and exact matching)
        const allNodes = await db
            .collection<Node>("nodes")
            .find({ root_id: rootId })
            .project({ id: 1, title: 1, summary: 1, parent_id: 1, embedding: 1 })
            .toArray();

        if (allNodes.length === 0) {
            return Response.json(
                { error: "No nodes found in workspace" },
                { status: 404 }
            );
        }

        // Debug: Check if nodes have embeddings
        const nodesWithEmbeddings = allNodes.filter(n => n.embedding && n.embedding.length > 0);
        console.log(`Nodes in workspace: ${allNodes.length}, Nodes with embeddings: ${nodesWithEmbeddings.length}`);

        // Use vector search to find top 5 most semantically similar nodes
        const queryEmbedding = await generateEmbedding(question);
        let similarNodes = await vectorSearch(queryEmbedding, rootId, 5);

        // Debug: Log vector search results to diagnose routing issues
        console.log("Vector search results for question:", question);
        console.log("Similar nodes found:", similarNodes.map(n => ({
            title: (n as any).title,
            score: n.score,
            id: n.id
        })));

        // FALLBACK: If vector search returns empty but nodes exist, use all nodes
        // This handles cases where vector index isn't set up or nodes lack embeddings
        if (similarNodes.length === 0 && allNodes.length > 0) {
            console.log("WARNING: Vector search returned empty. Using all nodes as fallback.");
            similarNodes = allNodes.map(n => ({
                id: n.id,
                title: n.title,
                summary: n.summary,
                parent_id: n.parent_id,
                score: 0.5, // Neutral score since we can't rank them
            })) as any;
        }

        // Build context about the TOP similar nodes (with details)
        const topNodeIds = new Set([rootId, ...similarNodes.map(n => n.id)]);
        const topNodes = allNodes.filter(n => topNodeIds.has(n.id));
        
        const nodeDescriptions = topNodes.map((node) => {
            const isRoot = node.parent_id === null;
            const similarNode = similarNodes.find(n => n.id === node.id);
            const scoreInfo = similarNode ? ` (Similarity: ${(similarNode.score * 100).toFixed(1)}%)` : " (ROOT NODE)";
            
            return `- Node ID: ${node.id}
  Title: "${node.title}"${scoreInfo}
  ${node.summary ? `Summary: ${node.summary}` : "(No summary yet - this node hasn't been explored)"}
  Type: ${isRoot ? "ROOT NODE" : "Subtopic"}`;
        }).join("\n\n");

        // Also provide a complete list of ALL node titles/IDs for exact matching
        const allNodesList = allNodes.map(n => `- "${n.title}" (ID: ${n.id})`).join("\n");

        // Perform Google search to get real-time context about the question
        let searchContext = "";
        try {
            console.log("Starting Google search for:", question);
            
            // If user is viewing a node (context-aware), enrich the search query
            const searchQuery = currentNode 
                ? `${question} (Context: asking about "${currentNode.title}")`
                : question;
            
            console.log("Search query with context:", searchQuery);
            
            const searchResult = await generateText({
                model: google("gemini-2.0-flash-exp"),
                prompt: `Search for detailed information about: "${searchQuery}"\n\n${currentNode ? `Note: The user is currently viewing a node about "${currentNode.title}".${recentMessages && recentMessages.length > 0 ? ` Recent conversation shows they were discussing this topic. ` : ' '}Pronouns like "his", "her", "it", "this", "their" likely refer to "${currentNode.title}".\n\n` : ''}Provide a comprehensive summary including:\n- Main facts and description\n- ALL relevant connections, affiliations, categories, or relationships\n- For people: organizations, teams, companies, fields they work in\n- For concepts: parent topics, fields of study, categories\n- Historical context if relevant\n\nBe thorough - include ALL connections that might be relevant.`,
                tools: {
                    google_search: google.tools.googleSearch({}),
                },
            });
            
            console.log("Search completed:", searchResult.text);
            if (searchResult.text) {
                searchContext = `\n## Web Search Results:\n${searchResult.text}\n`;
            }
        } catch (error: any) {
            console.error("Search failed, continuing without web context:", error?.message || error);
            // Continue without search context if it fails - routing will still work
        }

        console.log("Proceeding to routing decision with search context:", !!searchContext);

        // Clean the question - remove transcription artifacts like "..." at start
        const cleanedQuestion = question.replace(/^\.{2,}\s*/g, '').trim();
        
        // Extract the main topic from the question for better routing decisions
        const topicPatterns = [
            /(?:what is|explain|tell me about|who is|how does|give me an example of|an example of)\s+(?:the\s+)?(.+?)(?:\?|$)/i,
            /(.+?)\s+(?:example|explanation|definition)/i,
        ];
        let extractedTopic = "";
        for (const pattern of topicPatterns) {
            const match = cleanedQuestion.match(pattern);
            if (match && match[1]) {
                extractedTopic = match[1].trim().replace(/\?$/, '').replace(/^the\s+/i, '');
                break;
            }
        }
        
        // Check if a node with this exact topic already exists (fuzzy match)
        const topicExistsAsNode = extractedTopic && allNodes.some(n => {
            const titleLower = n.title.toLowerCase().replace(/[-_]/g, ' ');
            const topicLower = extractedTopic.toLowerCase().replace(/[-_]/g, ' ');
            // Match if title contains topic or topic contains title
            // Also handle variations like "U-Substitution" vs "u substitution"
            return titleLower.includes(topicLower) || 
                   topicLower.includes(titleLower) ||
                   titleLower.replace(/\s+/g, '').includes(topicLower.replace(/\s+/g, '')) ||
                   topicLower.replace(/\s+/g, '').includes(titleLower.replace(/\s+/g, ''));
        });
        
        // Find the matching node if it exists
        const matchingNode = extractedTopic ? allNodes.find(n => {
            const titleLower = n.title.toLowerCase().replace(/[-_]/g, ' ');
            const topicLower = extractedTopic.toLowerCase().replace(/[-_]/g, ' ');
            return titleLower.includes(topicLower) || 
                   topicLower.includes(titleLower) ||
                   titleLower.replace(/\s+/g, '').includes(topicLower.replace(/\s+/g, '')) ||
                   topicLower.replace(/\s+/g, '').includes(titleLower.replace(/\s+/g, ''));
        }) : null;
        
        console.log("Extracted topic:", extractedTopic, "| Exists as node:", topicExistsAsNode, "| Matching node:", matchingNode?.title);

        // If we found an exact matching node, route to it directly without AI
        if (topicExistsAsNode && matchingNode) {
            console.log("Direct routing to existing node:", matchingNode.title);
            return Response.json({
                action: "navigate_to_existing",
                nodeId: matchingNode.id,
                nodeTitle: matchingNode.title,
                reasoning: `Found existing node "${matchingNode.title}" matching topic "${extractedTopic}"`,
                question: cleanedQuestion,
            });
        }

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
            }),
            prompt: `You are a routing system for a knowledge graph. Your job is to decide whether to CREATE a new node or USE an existing one.
${currentNodeContext}${searchContext}
## Top 5 Most Relevant Nodes (via Vector Search):
${nodeDescriptions}

## ALL Available Nodes:
${allNodesList}

## User's Question:
"${cleanedQuestion}"

## Extracted Topic: "${extractedTopic}"
## Does a node with this EXACT topic exist? ${topicExistsAsNode ? "YES - USE EXISTING!" : "NO - Consider creating new"}

## ROUTING RULES (FOLLOW EXACTLY):

### RULE 1: If the EXACT topic does NOT have its own node → CREATE_NEW
The user asked about "${extractedTopic}". 
Look at the "ALL Available Nodes" list above. Is there a node titled "${extractedTopic}" or very similar?
- If NO node exists for "${extractedTopic}" → **action: "create_new"**
- Find the best parent node (most relevant existing node)

Examples of when to CREATE_NEW:
- Question: "What is the power rule?" | Nodes: [Derivatives, Calculus] | No "Power Rule" node → CREATE_NEW under Derivatives
- Question: "Who is Bronny James?" | Nodes: [LeBron James, NBA] | No "Bronny James" node → CREATE_NEW under LeBron James  
- Question: "Explain integration" | Nodes: [Calculus] | No "Integration" node → CREATE_NEW under Calculus

### RULE 2: If the EXACT topic already has its own node → USE_EXISTING
Only use an existing node if:
- A node with the SAME or VERY SIMILAR title exists
- Example: "What is the chain rule?" + "Chain Rule Explained" exists → use_existing

### RULE 3: High similarity to PARENT ≠ Duplicate
- "Power rule" having 75% similarity to "Derivatives" does NOT mean use Derivatives
- "Power rule" is a SUBTOPIC of derivatives, so CREATE a new "Power Rule" node UNDER Derivatives

## YOUR TASK:
1. Does "${extractedTopic}" have its own node in the ALL Available Nodes list? 
2. If NO → action: "create_new", find best parentNodeId, suggest title "${extractedTopic.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}"
3. If YES → action: "use_existing", use that node's existingNodeId

## DECISION LOGIC (SIMPLE):

**CREATE_NEW when:**
- The topic "${extractedTopic}" does NOT have its own node yet
- User is asking about a specific subtopic (technique, person, concept)
- Examples: "power rule" under Derivatives, "Bronny James" under LeBron James

**USE_EXISTING when:**  
- A node with the SAME title as "${extractedTopic}" already exists
- User is asking a follow-up about the current node (uses pronouns like "this", "it", "his")
- User is asking for a simple attribute (age, date, stats)

## KEY INSIGHT:
High similarity to a PARENT topic ≠ duplicate. 
"Power rule" (75% similar to Derivatives) should CREATE a new node UNDER Derivatives, not use Derivatives.

Respond with your routing decision:`,
        });

        const decision = result.object as RoutingDecision;

        // If creating a new node, return the decision without creating yet
        // Frontend will create after user confirms
        if (decision.action === "create_new" && decision.parentNodeId && decision.suggestedTitle) {
            // Verify parent exists (search in ALL nodes, not just top similar)
            const parentNode = allNodes.find(n => n.id === decision.parentNodeId);
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
            // Verify the node exists (search in ALL nodes, not just top similar)
            const existingNode = allNodes.find(n => n.id === decision.existingNodeId);
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
        console.error("Routing error details:", {
            message: error.message,
            stack: error.stack,
            name: error.name,
        });
        return Response.json(
            { error: error.message || "Failed to route question" },
            { status: 500 }
        );
    }
}
