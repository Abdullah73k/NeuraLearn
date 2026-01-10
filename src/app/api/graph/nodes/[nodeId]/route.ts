import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/db/client";
import type { Node } from "@/types/graph";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ nodeId: string }>;
}

/**
 * GET /api/graph/nodes/[nodeId]
 * 
 * Get a specific node with its full context
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { nodeId } = await params;

    const db = await getMongoDb();

    const node = await db.collection<Node>("nodes").findOne({ id: nodeId });

    if (!node) {
      return NextResponse.json(
        { error: "Node not found" },
        { status: 404 }
      );
    }

    // Get children
    const children = await db
      .collection<Node>("nodes")
      .find({ id: { $in: node.children_ids } })
      .project({ id: 1, title: 1, summary: 1 })
      .toArray();

    // Get ancestors
    const ancestorIds = node.ancestor_path.filter((id) => id !== nodeId);
    const ancestors = await db
      .collection<Node>("nodes")
      .find({ id: { $in: ancestorIds } })
      .project({ id: 1, title: 1, summary: 1 })
      .toArray();

    // Sort ancestors by path order
    const sortedAncestors = ancestorIds.map((id) =>
      ancestors.find((a) => a.id === id)
    );

    // Get parent
    const parent = node.parent_id
      ? await db
          .collection<Node>("nodes")
          .findOne({ id: node.parent_id }, { projection: { id: 1, title: 1, summary: 1 } })
      : null;

    return NextResponse.json({
      success: true,
      node: {
        id: node.id,
        title: node.title,
        summary: node.summary,
        parent_id: node.parent_id,
        root_id: node.root_id,
        tags: node.tags,
        interaction_count: node.interaction_count,
        created_at: node.created_at,
        last_refined_at: node.last_refined_at,
      },
      parent,
      children,
      ancestors: sortedAncestors.filter(Boolean),
      ancestor_path: node.ancestor_path,
    });
  } catch (error) {
    console.error("Get node error:", error);
    return NextResponse.json(
      { error: "Failed to get node" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/graph/nodes/[nodeId]
 * 
 * Update a node's title, summary, or tags
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { nodeId } = await params;
    const body = await req.json();

    const db = await getMongoDb();

    const node = await db.collection<Node>("nodes").findOne({ id: nodeId });

    if (!node) {
      return NextResponse.json(
        { error: "Node not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updates: Partial<Node> = {};

    if (body.title && typeof body.title === "string") {
      updates.title = body.title.slice(0, 50);
    }

    if (body.summary && typeof body.summary === "string") {
      updates.summary = body.summary.slice(0, 200);
    }

    if (body.tags && Array.isArray(body.tags)) {
      updates.tags = body.tags.filter((t: any) => typeof t === "string");
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid updates provided" },
        { status: 400 }
      );
    }

    // Update node
    await db.collection("nodes").updateOne({ id: nodeId }, { $set: updates });

    // Update Moorcheh if summary changed
    if (updates.summary) {
      const { moorcheh } = await import("@/lib/moorcheh/client");
      const { RootTopic } = await import("@/types/graph");

      const rootTopic = await db
        .collection("root_topics")
        .findOne({ id: node.root_id });

      if (rootTopic) {
        await moorcheh.updateNodeContent(
          rootTopic.moorcheh_collection_id,
          node.moorcheh_document_id,
          `# ${updates.title || node.title}\n\n${updates.summary}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      node: {
        id: nodeId,
        ...updates,
      },
    });
  } catch (error) {
    console.error("Update node error:", error);
    return NextResponse.json(
      { error: "Failed to update node" },
      { status: 500 }
    );
  }
}
