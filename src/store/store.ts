import { AppNode } from "@/types/nodes";
import {
	applyNodeChanges,
	Connection,
	Edge,
	EdgeChange,
	NodeChange,
} from "@xyflow/react";
import { UIMessage } from "ai";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type WorkSpaceNode = {
	node: AppNode;
	messages: UIMessage[]; // placeholder for when i get
	edges: Edge[];
};

type MindMapWorkspace = {
	id: string;
	title: string;
	nodes: WorkSpaceNode[];
};

type MindMapActions = {
	setSelectedNode: (node: AppNode | null) => void;
	setIsChatBarOpen: () => void;
	createWorkspace: () => void;
	deleteWorkspace: (id: string) => void;

	setActiveWorkspace: (id: string) => void;
	onNodesChangeForActive: (changes: NodeChange<AppNode>[]) => void;
	// onEdgesChangeForActive: (changes: EdgeChange<Edge>[]) => void;
	// onConnectForActive: (connection: Connection) => void;
};

type MindMapStore = {
	selectedNode: AppNode | null;
	isChatBarOpen: boolean;
	actions: MindMapActions;
	workspaces: MindMapWorkspace[];
	activeWorkspaceId: string | null;
};

export const useMindMapStore = create<MindMapStore>()(
	persist(
		(set, get) => ({
			selectedNode: null,
			isChatBarOpen: false,
			workspaces: [],
			activeWorkspaceId: null,
			actions: {
				setSelectedNode(node: AppNode | null) {
					set({ selectedNode: node });
				},
				setIsChatBarOpen() {
					set((state) => ({ isChatBarOpen: !state.isChatBarOpen }));
				},
				createWorkspace() {
					const newWorkspaceId = crypto.randomUUID();
					set((state) => ({
						workspaces: [
							...state.workspaces,
							{
								id: newWorkspaceId,
								title: "New Workspace",
								nodes: [
									{
										node: {
											id: crypto.randomUUID(),
											type: "root",
											position: { x: 0, y: 0 },
											data: { title: "Main Topic of This Mindspace" },
										},
										messages: [],
										edges: [],
									},
								],
							},
						],
						activeWorkspaceId: newWorkspaceId,
					}));
				},
				deleteWorkspace(id: string) {
					set((state) => ({
						workspaces: state.workspaces.filter(
							(workspace) => workspace.id !== id
						),
						activeWorkspaceId: null,
					}));
				},
				setActiveWorkspace(id: string) {
					set((state) => ({
						activeWorkspaceId: id,
					}));
				},
				onNodesChangeForActive(changes) {
					const state = get();
					if (state.workspaces.length === 0) return;

					const activeWorkspace = state.workspaces.find(
						(workspace) => workspace.id === state.activeWorkspaceId
					);

					if (!activeWorkspace) return;

					const nodesSnapshot = activeWorkspace.nodes.map(
						(node) => node.node
					) as AppNode[];

					const updatedNodes = applyNodeChanges(changes, nodesSnapshot);

					const updatedWorkSpaceNodes = activeWorkspace.nodes.map((wsNode) => {
						const newNode = updatedNodes.find(
							(node) => node.id === wsNode.node.id
						);
						return newNode
							? {
									...wsNode,
									node: newNode,
							  }
							: wsNode;
					});
					const updatedWorkspace = {
						...activeWorkspace,
						nodes: updatedWorkSpaceNodes,
					};
					set({
						workspaces: [updatedWorkspace, ...state.workspaces],
					});
				},
			},
		}),
		{
			name: "mind-map-state",
			partialize: (state) => ({
				selectedNode: state.selectedNode,
				isChatBarOpen: state.isChatBarOpen,
				workspaces: state.workspaces,
				activeWorkspaceId: state.activeWorkspaceId,
			}),
		}
	)
);
