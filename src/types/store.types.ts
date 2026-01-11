import { UIMessage } from "ai";
import { AppNode } from "./nodes";
import { Edge, NodeChange, EdgeChange, Connection } from "@xyflow/react";
import { RelationType } from "./edges";
import { ChangeEvent } from "react";

export type MindMapWorkspace = {
	id: string;
	title: string;
	nodes: AppNode[];
	edges: Edge[];
	messages: Record<string, UIMessage[]>;
	nodeChatSummaries: Record<string, string>;
};

export type MindMapActions = {
	setSelectedNode: (node: AppNode | null) => void;
	setIsChatBarOpen: () => void;
	createWorkspace: () => Promise<void>;
	deleteWorkspace: (id: string) => void;
	renameWorkspace: (id: string, newTitle: string) => void;
	deleteNode: (id: string) => void;

	setNoteNodeTitle: (event: ChangeEvent<HTMLInputElement>, id: string) => void;
	setNoteNodeDescription: (
		event: ChangeEvent<HTMLTextAreaElement>,
		id: string
	) => void;
	setSubTopicNodeTitle: (
		event: ChangeEvent<HTMLInputElement>,
		id: string
	) => Promise<void>;
	setRootNodeTitle: (event: ChangeEvent<HTMLInputElement>) => void;
	createNodeChatSummary: (nodeId: string, summary: string) => void;
	appendNodeChat: (nodeId: string, messages: UIMessage[]) => void;
	addMessageToNode: (nodeId: string, message: UIMessage) => void;
	closeChatBar: () => void;
	setCurrentRelationType: (relation: RelationType) => void;
	setActiveWorkspace: (id: string) => void;
	createNoteNode: () => void;
	createNoteNodeOnTarget: (targetNodeId: string, noteTitle: string, noteContent: string) => void;
	createSubtopicNode: () => Promise<void>;
	loadWorkspacesFromDb: () => Promise<void>;
	onNodesChangeForActive: (changes: NodeChange<AppNode>[]) => void;
	onEdgesChangeForActive: (changes: EdgeChange<Edge>[]) => void;
	onConnectForActive: (connection: Connection) => void;
	rebalanceLayout: () => void;
};

export type MindMapStore = {
	selectedNode: AppNode | null;
	isChatBarOpen: boolean;
	actions: MindMapActions;
	workspaces: MindMapWorkspace[];
	activeWorkspaceId: string | null;
	currentRelationType: RelationType;
};
