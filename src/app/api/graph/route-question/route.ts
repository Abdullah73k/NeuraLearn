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

        // Use vector search to find top 5 most semantically similar nodes
        const queryEmbedding = await generateEmbedding(question);
        const similarNodes = await vectorSearch(queryEmbedding, rootId, 5);

        // Fetch ALL nodes in the workspace (for finding exact matches)
        const allNodes = await db
            .collection<Node>("nodes")
            .find({ root_id: rootId })
            .project({ id: 1, title: 1, summary: 1, parent_id: 1 })
            .toArray();

        if (allNodes.length === 0) {
            return Response.json(
                { error: "No nodes found in workspace" },
                { status: 404 }
            );
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

        // Use AI to determine the best routing
        const result = await generateObject({
            model: google("gemini-2.0-flash"),
            schema: z.object({
                action: z.enum(["use_existing", "create_new"]),
                reasoning: z.string().max(500),
                existingNodeId: z.string().optional(),
                parentNodeId: z.string().optional(),
                suggestedTitle: z.string().max(60).optional(),
                suggestedSummary: z.string().max(300).optional(),
            }) as any,
            prompt: `You are a routing system for a knowledge graph. Route user questions to the right place.
${currentNodeContext}${searchContext}
## Top 5 Most Relevant Nodes (via Vector Search):
${nodeDescriptions}

## ALL Available Nodes (for exact matching):
${allNodesList}

## User's Question:
"${question}"

## Decision Logic:

### STEP 0: Handle Follow-up Questions (Context-Aware)
**If user is currently viewing a node (see "Current Context" above):**
- Questions with pronouns like "his", "her", "it", "this", "their", "them" likely refer to the current node
- Example: Viewing "LeBron James" → "What's his scoring average?" → **use_existing** (refers to LeBron)
- Example: Viewing "Calculus" → "Give me an example of this" → **use_existing** (refers to Calculus)
- If the follow-up is clearly about a different topic, proceed to normal routing

### STEP 1: Check for Existing Nodes (Prevent Duplicates & Handle Info Requests)
**USE EXISTING NODE** (action: "use_existing") when:

**A. Info Request Pattern (CHECK THIS FIRST!):**
IF question is "[Entity/Topic Name] + [attribute/info request]" (e.g., "LeBron James age", "Giannis stats", "Calculus uses"):
  1. Look in "ALL Available Nodes" list for a node that matches the ENTITY/TOPIC NAME
  2. If that node exists → **use_existing** with that node's ID
  3. DO NOT route to parent/related nodes - route to THE ENTITY'S OWN NODE
  
Examples:
- "LeBron James age" → Check ALL nodes list for "LeBron James" → If exists, **use_existing** with its ID (NOT "NBA" or "Lakers"!)
- "How old is LeBron James?" → Check ALL nodes list for "LeBron James" → If exists, **use_existing**
- "Giannis career stats" → Check ALL nodes list for "Giannis" → If exists, **use_existing**

**B. Exact/Near Duplicate:**
- A node exists with **HIGH similarity (>85%)** AND similar/matching title
  - "Who is LeBron James?" + "LeBron James" node (92% similarity) → **use_existing**
  - "What are derivatives?" + "Derivatives" node (88% similarity) → **use_existing**

**C. More Info About Node's Existing Content:**
- The question asks for more info about something ALREADY in that node's summary
  - "Lakers" node mentions "LeBron", user asks "Tell me about LeBron on the Lakers" → **use_existing** Lakers node

### STEP 2: Create New Node (Only if no duplicate exists)
**CREATE NEW NODE** (action: "create_new") when:
- **No high-similarity match exists** (<85% on all nodes)
- The question is about a **GENUINELY NEW entity/topic/concept** not yet covered

**Finding the Best Parent (UNIVERSAL - Works for ANY domain):**
1. **Extract ALL relevant connections** from web search results
   - For people: organizations, teams, companies they work for, fields they work in, movements they're part of
   - For concepts: parent topics, fields of study, categories they belong to
   - For events: locations, time periods, related movements or topics
   - For anything: ANY mention of topics, categories, or entities that might have nodes
   - **DO NOT just use the FIRST connection** - consider ALL connections mentioned
   
2. **Cross-reference EVERY connection with "ALL Available Nodes" list**
   - Check EACH connection individually against the nodes list
   - Match on: exact names, partial names, synonyms, related terms
   - Example: Brook Lopez search mentions "Milwaukee Bucks (2021 championship)" + "LA Clippers (current)" → Check if "Milwaukee Bucks" exists, check if "LA Clippers" exists
   
3. **Prefer specific/narrow nodes over generic/root nodes**
   - "Calculus" > "Mathematics"
   - "Milwaukee Bucks" > "NBA"
   - "World War II" > "History"
   - "React Hooks" > "React" > "JavaScript"
   
4. **Only use root node if truly no relevant connection found**

## Examples:
**Info Requests (Priority #1):**
- Question: "LeBron James age"
  - Nodes: "NBA" (70%), "LeBron James" (95%), "Lakers" (80%)
  - Decision: **use_existing "LeBron James"** (route to entity's own node, NOT "NBA"!)
- Question: "Giannis career stats"
  - Nodes: "Milwaukee Bucks" (75%), "Giannis Antetokounmpo" (93%)
  - Decision: **use_existing "Giannis Antetokounmpo"** (route to Giannis, NOT Bucks!)

**Preventing Duplicates:**
- "Who is Giannis?" + "Giannis Antetokounmpo" exists (95% similarity) → **use_existing**
- "Tell me about LeBron" + "LeBron James" exists (90% similarity) → **use_existing**
- "What is calculus?" + "Calculus" exists (88% similarity) → **use_existing**

**Creating New Nodes (Cross-Domain Examples):**

**Sports:**
- "Who is Brook Lopez?"
  - Search: "Won championship with Milwaukee Bucks in 2021"
  - Nodes: "Milwaukee Bucks" exists
  - Decision: **create_new** under "Milwaukee Bucks" ✓

**Mathematics:**
- "What is the chain rule?"
  - Search: "Fundamental theorem in calculus for finding derivatives"
  - Nodes: "Calculus" exists, "Derivatives" exists
  - Decision: **create_new** under "Derivatives" (more specific) or "Calculus" ✓

**History:**
- "Who is Winston Churchill?"
  - Search: "British Prime Minister during World War II"
  - Nodes: "World War II" exists, "United Kingdom" exists
  - Decision: **create_new** under "World War II" (strongest connection) ✓

**Technology:**
- "What is useState?"
  - Search: "React Hook for managing state in functional components"
  - Nodes: "React" exists, "JavaScript" exists
  - Decision: **create_new** under "React" (more specific than JavaScript) ✓

**No Relevant Node:**
- "Who is Random Person?"
  - Search: "Person who does thing"
  - Nodes: No relevant connections found
  - Decision: **create_new** under ROOT NODE
- "What is the chain rule?" + "Calculus" (70%), NO "Chain Rule" node exists → **create_new** under "Calculus"
- "Who is Giannis?" + "Milwaukee Bucks" (80%), NO "Giannis" node → **create_new** under "Milwaukee Bucks"

## CRITICAL RULES:
1. **PRIORITY ORDER**: Info Request Pattern (Step 1A) → Check ALL nodes list for exact match → Duplicates (Step 1B) → New Nodes (Step 2)
2. **For Info Requests**: Search the "ALL Available Nodes" list for the entity name, use that node's exact ID
3. **For creating new nodes (UNIVERSAL LOGIC)**: 
   - Extract ALL connections/relationships/categories from web search results
   - Check if ANY of those connections exist in "ALL Available Nodes" list
   - Prefer specific nodes over generic/root nodes (more specific = better)
   - Works for ANY domain: sports, math, science, history, tech, literature, etc.
   - Use exact node IDs from the ALL nodes list
4. **Always use exact node IDs** from either the Top 5 list or the ALL nodes list
5. **suggestedTitle**: MAX 3-4 words, match existing naming style
6. **suggestedSummary**: Use information from web search results when available
7. **reasoning**: Explain in detail which connections from search you found, which nodes they match to, and why you chose this parent (max 500 chars)

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
