/**
 * Maps React Flow node type ids to the custom components rendered on the canvas.
 * Used by <ReactFlow nodeTypes={nodeTypes} />.
 */
import type { NodeTypes } from "@xyflow/react";
import { RootNodeComponent } from "@/components/nodes/root-node";
import { SubtopicNodeComponent } from "@/components/nodes/subtopic-node";
import { NoteNodeComponent } from "@/components/nodes/note-node";

export const nodeTypes: NodeTypes = {
	root: RootNodeComponent,
	subtopic: SubtopicNodeComponent,
	note: NoteNodeComponent,
};
