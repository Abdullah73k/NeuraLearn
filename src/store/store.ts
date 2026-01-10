import { AppNode } from "@/types/nodes";
import {
	applyNodeChanges,
	Edge,
	NodeChange,
	EdgeChange,
	applyEdgeChanges,
} from "@xyflow/react";
import { UIMessage } from "ai";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type MindMapWorkspace = {
	id: string;
	title: string;
	nodes: AppNode[];
	edges: Edge[];
	messages: Record<string, UIMessage[]>;
};

type MindMapActions = {
	setSelectedNode: (node: AppNode | null) => void;
	setIsChatBarOpen: () => void;
	createWorkspace: () => void;
	deleteWorkspace: (id: string) => void;

	setActiveWorkspace: (id: string) => void;
	onNodesChangeForActive: (changes: NodeChange<AppNode>[]) => void;
	onEdgesChangeForActive: (changes: EdgeChange<Edge>[]) => void;
	// onConnectForActive: (connection: Connection) => void;
};

type MindMapStore = {
	selectedNode: AppNode | null;
	isChatBarOpen: boolean;
	actions: MindMapActions;
	workspaces: MindMapWorkspace[];
	activeWorkspaceId: string | null;
};

const activeWorkspaceHelper = (state: MindMapStore) =>
	state.workspaces.find(
		(workspace) => workspace.id === state.activeWorkspaceId
	);

const updateWorkspaceHelper = (
	state: MindMapStore,
	updatedWorkspace: MindMapWorkspace
) => {
	return state.workspaces.map((workspace) =>
		workspace.id === updatedWorkspace.id ? updatedWorkspace : workspace
	);
};

export const useMindMapStore = create<MindMapStore>()(
	persist(
		(set, get) => ({
			selectedNode: null as AppNode | null,
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
										id: crypto.randomUUID(),
										type: "root",
										position: { x: 0, y: 0 },
										data: { title: "Main Topic of This Mindspace" },
									},
								],
								edges: [],
								messages: {},
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

					const activeWorkspace = activeWorkspaceHelper(state);

					if (!activeWorkspace) return;

					const nodesSnapshot = activeWorkspace.nodes;

					const updatedNodes = applyNodeChanges(changes, nodesSnapshot);

					const updatedWorkspace = {
						...activeWorkspace,
						nodes: updatedNodes,
					} as MindMapWorkspace;
					set({
						workspaces: updateWorkspaceHelper(state, updatedWorkspace),
					});
				},
				onEdgesChangeForActive(changes) {
					const state = get();
					if (state.workspaces.length === 0) return;

					const activeWorkspace = activeWorkspaceHelper(state);

					if (!activeWorkspace) return;

					const edgesSnapshot = activeWorkspace.edges;

					const updatedEdges = applyEdgeChanges(changes, edgesSnapshot);

					const updatedWorkspace = {
						...activeWorkspace,
						edges: updatedEdges,
					} as MindMapWorkspace;

					set({
						workspaces: updateWorkspaceHelper(state, updatedWorkspace),
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
