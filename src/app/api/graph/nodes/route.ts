import { NextRequest, NextResponse } from "next/server";
import { createNode } from "@/lib/graph-tools";

export const runtime = "nodejs";

interface CreateNodeBody {
  title: string;
  summary: string;
  parent_id: string;
  tags?: string[];
}

/**
 * POST /api/graph/nodes
 * 
 * Create a new node under a parent node
 */
export async function POST(req: NextRequest) {
  try {
    const body: CreateNodeBody = await req.json();

    // Validate required fields
    if (!body.title || !body.summary || !body.parent_id) {
      return NextResponse.json(
        { error: "Missing required fields: title, summary, parent_id" },
        { status: 400 }
      );
    }

    // Create the node using graph-tools
    const result = await createNode({
      title: body.title.trim(),
      summary: body.summary.trim(),
      parent_id: body.parent_id,
      tags: body.tags || [],
    });

    // Check if there was an error
    if ('error' in result) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      node: {
        id: result.id,
        title: result.title,
        summary: result.summary,
        parent_id: result.parent_id,
        ancestor_path: result.ancestor_path,
      },
    });
  } catch (error) {
    console.error("Create node error:", error);
    return NextResponse.json(
      {
        error: "Failed to create node",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
