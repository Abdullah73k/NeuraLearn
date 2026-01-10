import { UIMessage } from "ai";
import { AppNode } from "./nodes";
import { Edge, NodeChange, EdgeChange, Connection } from "@xyflow/react";

export type MindMapWorkspace = {
	id: string;
	title: string;
	nodes: AppNode[];
	edges: Edge[];
	messages: Record<string, UIMessage[]>;
};

export type MindMapActions = {
	setSelectedNode: (node: AppNode | null) => void;
	setIsChatBarOpen: () => void;
	createWorkspace: () => void;
	deleteWorkspace: (id: string) => void;

	setActiveWorkspace: (id: string) => void;
	onNodesChangeForActive: (changes: NodeChange<AppNode>[]) => void;
	onEdgesChangeForActive: (changes: EdgeChange<Edge>[]) => void;
	onConnectForActive: (connection: Connection) => void;
};

export type MindMapStore = {
	selectedNode: AppNode | null;
	isChatBarOpen: boolean;
	actions: MindMapActions;
	workspaces: MindMapWorkspace[];
	activeWorkspaceId: string | null;
};
