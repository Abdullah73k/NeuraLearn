import { NoteNode } from "@/components/nodes/note-node";
import { RootNode } from "@/components/nodes/root-node";
import { SubtopicNode } from "@/components/nodes/subtopic-node";
import { NodeTypes } from "@xyflow/react";

export const nodeTypes: NodeTypes = {
	root: RootNode,
	subtopic: SubtopicNode,
	note: NoteNode,
};
