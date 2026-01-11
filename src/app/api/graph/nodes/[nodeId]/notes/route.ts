import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/lib/db/client";
import type { Node, NodeNote } from "@/types/graph";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ nodeId: string }>;
}

/**
 * GET /api/graph/nodes/[nodeId]/notes
 * 
 * Get all notes for a node
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { nodeId } = await params;

    const db = await getMongoDb();

    const node = await db.collection<Node>("nodes").findOne(
      { id: nodeId },
      { projection: { notes: 1 } }
    );

    if (!node) {
      return NextResponse.json(
        { error: "Node not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      notes: node.notes || [],
    });
  } catch (error) {
    console.error("Get notes error:", error);
    return NextResponse.json(
      { error: "Failed to get notes" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/graph/nodes/[nodeId]/notes
 * 
 * Add a new note to a node
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { nodeId } = await params;
    const { content } = await req.json();

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Note content is required" },
        { status: 400 }
      );
    }

    const db = await getMongoDb();

    const node = await db.collection<Node>("nodes").findOne({ id: nodeId });

    if (!node) {
      return NextResponse.json(
        { error: "Node not found" },
        { status: 404 }
      );
    }

    const newNote: NodeNote = {
      id: randomUUID(),
      content: content.trim(),
      created_at: new Date(),
    };

    // Add note to node's notes array
    await db.collection("nodes").updateOne(
      { id: nodeId },
      { 
        $push: { notes: newNote } as any
      }
    );

    return NextResponse.json({
      success: true,
      note: newNote,
      nodeTitle: node.title,
    });
  } catch (error) {
    console.error("Add note error:", error);
    return NextResponse.json(
      { error: "Failed to add note" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/graph/nodes/[nodeId]/notes
 * 
 * Delete a specific note from a node
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { nodeId } = await params;
    const { noteId } = await req.json();

    if (!noteId) {
      return NextResponse.json(
        { error: "Note ID is required" },
        { status: 400 }
      );
    }

    const db = await getMongoDb();

    const result = await db.collection("nodes").updateOne(
      { id: nodeId },
      { $pull: { notes: { id: noteId } } as any }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Node not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Delete note error:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
