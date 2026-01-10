import { AppNode } from "@/types/nodes";
import { MindMapStore, MindMapWorkspace } from "@/types/store.types";
import { applyNodeChanges, applyEdgeChanges, addEdge } from "@xyflow/react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
	activeWorkspaceHelper,
	updateWorkspaceHelper,
} from "../utils/store.utils";

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
								title: "Main Topic of This Mindspace",
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
					set(() => ({
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
				onConnectForActive(connection) {
					const state = get();
					if (state.workspaces.length === 0) return;

					const activeWorkspace = activeWorkspaceHelper(state);

					if (!activeWorkspace) return;

					const edgesSnapshot = activeWorkspace.edges;

					const updatedEdges = addEdge(connection, edgesSnapshot);

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
