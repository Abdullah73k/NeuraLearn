import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/db/client";
import type { NodeInteraction } from "@/types/graph";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ nodeId: string }>;
}

/**
 * GET /api/graph/nodes/[nodeId]/interactions
 * 
 * Get all chat interactions for a specific node
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { nodeId } = await params;

    const db = await getMongoDb();

    const interactions = await db
      .collection<NodeInteraction>("node_interactions")
      .find({ node_id: nodeId })
      .sort({ timestamp: 1 })
      .toArray();

    return NextResponse.json({
      success: true,
      interactions: interactions.map((i) => ({
        user_message: i.user_message,
        ai_response: i.ai_response,
        timestamp: i.timestamp,
      })),
    });
  } catch (error) {
    console.error("Get interactions error:", error);
    return NextResponse.json(
      { error: "Failed to get interactions" },
      { status: 500 }
    );
  }
}
