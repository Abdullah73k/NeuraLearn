import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/db/client";
import type { RootTopic, Node } from "@/types/graph";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ topicId: string }>;
}

/**
 * GET /api/graph/topics/[topicId]
 * 
 * Get a topic and its full node tree
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { topicId } = await params;

    const db = await getMongoDb();

    // Get root topic
    const topic = await db
      .collection<RootTopic>("root_topics")
      .findOne({ id: topicId });

    if (!topic) {
      return NextResponse.json(
        { error: "Topic not found" },
        { status: 404 }
      );
    }

    // Get all nodes for this topic
    const nodes = await db
      .collection<Node>("nodes")
      .find({ root_id: topicId })
      .toArray();

    // Build tree structure
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const rootNode = nodeMap.get(topicId);

    // Build adjacency for frontend
    const edges = nodes
      .filter((n) => n.parent_id)
      .map((n) => ({
        id: `${n.parent_id}-${n.id}`,
        source: n.parent_id,
        target: n.id,
      }));

    return NextResponse.json({
      success: true,
      topic: {
        id: topic.id,
        title: topic.title,
        description: topic.description,
        node_count: topic.node_count,
        created_at: topic.created_at,
      },
      nodes: nodes.map((n) => ({
        id: n.id,
        title: n.title,
        summary: n.summary,
        parent_id: n.parent_id,
        children_ids: n.children_ids,
        ancestor_path: n.ancestor_path,
        interaction_count: n.interaction_count,
        tags: n.tags,
        position: n.position, // Include saved position for ReactFlow
      })),
      edges,
      rootNode: rootNode
        ? {
            id: rootNode.id,
            title: rootNode.title,
            summary: rootNode.summary,
          }
        : null,
    });
  } catch (error) {
    console.error("Get topic error:", error);
    return NextResponse.json(
      { error: "Failed to get topic" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/graph/topics/[topicId]
 * 
 * Update a topic's title or description
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { topicId } = await params;
    const body = await req.json();

    const db = await getMongoDb();

    const topic = await db.collection<RootTopic>("root_topics").findOne({ id: topicId });

    if (!topic) {
      return NextResponse.json(
        { error: "Topic not found" },
        { status: 404 }
      );
    }

    // Build update object
    const updates: Partial<RootTopic> = {};

    if (body.title && typeof body.title === "string") {
      updates.title = body.title.trim().slice(0, 100);
    }

    if (body.description && typeof body.description === "string") {
      updates.description = body.description.trim().slice(0, 500);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid updates provided" },
        { status: 400 }
      );
    }

    // Update topic
    await db.collection("root_topics").updateOne({ id: topicId }, { $set: updates });

    // Also update the root node's title if title was changed
    if (updates.title) {
      await db.collection("nodes").updateOne(
        { id: topicId, parent_id: null },
        { $set: { title: updates.title } }
      );
    }

    return NextResponse.json({
      success: true,
      topic: {
        id: topicId,
        ...updates,
      },
    });
  } catch (error) {
    console.error("Update topic error:", error);
    return NextResponse.json(
      { error: "Failed to update topic" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/graph/topics/[topicId]
 * 
 * Delete a topic and all its nodes
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { topicId } = await params;

    const db = await getMongoDb();

    // Check if topic exists
    const topic = await db
      .collection<RootTopic>("root_topics")
      .findOne({ id: topicId });

    if (!topic) {
      return NextResponse.json(
        { error: "Topic not found" },
        { status: 404 }
      );
    }

    // Get all node IDs for this topic BEFORE deleting them
    const nodeIds = await db
      .collection<Node>("nodes")
      .find({ root_id: topicId })
      .project({ id: 1 })
      .toArray();

    // Delete all nodes for this topic
    await db.collection("nodes").deleteMany({ root_id: topicId });

    // Delete all interactions for nodes in this topic
    if (nodeIds.length > 0) {
      await db
        .collection("node_interactions")
        .deleteMany({ node_id: { $in: nodeIds.map((n) => n.id) } });
    }

    // Delete the topic
    await db.collection("root_topics").deleteOne({ id: topicId });

    return NextResponse.json({
      success: true,
      message: "Topic deleted successfully",
    });
  } catch (error) {
    console.error("Delete topic error:", error);
    return NextResponse.json(
      { error: "Failed to delete topic" },
      { status: 500 }
    );
  }
}
