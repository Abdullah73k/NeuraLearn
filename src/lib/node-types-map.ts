/**
 * Maps React Flow node type ids to the custom components rendered on the canvas.
 * Used by <ReactFlow nodeTypes={nodeTypes} />.
 */
import type { NodeTypes } from "@xyflow/react";
import { RootNode } from "@/components/nodes/root-node";
import { SubtopicNode } from "@/components/nodes/subtopic-node";
import { NoteNode } from "@/components/nodes/note-node";

export const nodeTypes: NodeTypes = {
	root: RootNode,
	subtopic: SubtopicNode,
	note: NoteNode,
};
