import { AppNode, NoteNode, RootNode, SubtopicNode } from "@/types/nodes";
import { MindMapStore, MindMapWorkspace } from "@/types/store.types";
import { applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import {
	activeWorkspaceHelper,
	updateWorkspaceHelper,
} from "../utils/store.utils";

export const useMindMapStore = create<MindMapStore>()(
	devtools(
		persist(
			(set, get) => ({
				selectedNode: null,
				isChatBarOpen: false,
				workspaces: [],
				activeWorkspaceId: null,
				currentRelationType: "background",
				nodeChatSummaries: {},
				actions: {
					setSelectedNode(node) {
						set({ selectedNode: node });
					},
					setIsChatBarOpen() {
						set({ isChatBarOpen: true });
					},
					closeChatBar() {
						set({ isChatBarOpen: false });
					},
					setCurrentRelationType(relation) {
						set({ currentRelationType: relation });
					},
					createNodeChatSummary(nodeId, summary) {},
					setNoteNodeDescription(event, id) {
						const state = get();
						const activeWorkspace = activeWorkspaceHelper(state);
						if (!activeWorkspace) return;

						const noteNode = activeWorkspace.nodes.find(
							(node) => node.id === id
						) as NoteNode;

						if (!noteNode) return;

						const updatedNoteNode: NoteNode = {
							...noteNode,
							data: {
								...noteNode.data,
								description: event.target.value,
							},
						};

						const updatedWorkspace: MindMapWorkspace = {
							...activeWorkspace,
							nodes: activeWorkspace.nodes.map((node) =>
								node.id === id ? updatedNoteNode : node
							),
						};

						set({ workspaces: updateWorkspaceHelper(state, updatedWorkspace) });
					},
					setNoteNodeTitle(event, id) {
						const state = get();
						const activeWorkspace = activeWorkspaceHelper(state);
						if (!activeWorkspace) return;

						const noteNode = activeWorkspace.nodes.find(
							(node) => node.id === id
						) as NoteNode;

						if (!noteNode) return;

						const updatedNoteNode: NoteNode = {
							...noteNode,
							data: {
								...noteNode.data,
								title: event.target.value,
							},
						};

						const updatedWorkspace: MindMapWorkspace = {
							...activeWorkspace,
							nodes: activeWorkspace.nodes.map((node) =>
								node.id === id ? updatedNoteNode : node
							),
						};

						set({ workspaces: updateWorkspaceHelper(state, updatedWorkspace) });
					},
					setSubTopicNodeTitle(event, id) {
						const state = get();
						const activeWorkspace = activeWorkspaceHelper(state);
						if (!activeWorkspace) return;

						const subtopicNode = activeWorkspace.nodes.find(
							(node) => node.id === id
						) as SubtopicNode;

						if (!subtopicNode) return;

						const updatedSubtopicNode: SubtopicNode = {
							...subtopicNode,
							data: {
								...subtopicNode.data,
								title: event.target.value,
							},
						};

						const updatedWorkspace: MindMapWorkspace = {
							...activeWorkspace,
							nodes: activeWorkspace.nodes.map((node) =>
								node.id === id ? updatedSubtopicNode : node
							),
						};

						set({ workspaces: updateWorkspaceHelper(state, updatedWorkspace) });
					},
					setRootNodeTitle(event) {
						const state = get();
						const activeWorkspace = activeWorkspaceHelper(state);
						if (!activeWorkspace) return;

						const activeWorkspaceRootNode = activeWorkspace.nodes.filter(
							(node) => node.type === "root"
						)[0];
						const updatedRootNode: RootNode = {
							...activeWorkspaceRootNode,
							data: {
								...activeWorkspaceRootNode.data,
								title: event.target.value,
							},
						};
						const updatedWorkspace: MindMapWorkspace = {
							...activeWorkspace,
							nodes: activeWorkspace.nodes.map((node) =>
								node.id === activeWorkspaceRootNode.id ? updatedRootNode : node
							),
						};

						set({ workspaces: updateWorkspaceHelper(state, updatedWorkspace) });
					},
					appendNodeChat(nodeId, messages) {
						const state = get();
						if (state.workspaces.length === 0) return;
						const activeWorkspace = activeWorkspaceHelper(state);
						if (!activeWorkspace) return;
						const updatedWorkspace: MindMapWorkspace = {
							...activeWorkspace,
							messages: {
								...activeWorkspace.messages,
								[nodeId]: [...messages],
							},
						};
						set({
							workspaces: updateWorkspaceHelper(state, updatedWorkspace),
						});
					},
					deleteNode(id) {
						const state = get();
						if (state.workspaces.length === 0) return;
						const activeWorkspace = activeWorkspaceHelper(state);
						if (!activeWorkspace) return;
						const nodesSnapshot = activeWorkspace.nodes;
						const updatedNodes = nodesSnapshot.filter((node) => node.id !== id);
						const messagesToFilter = { ...activeWorkspace.messages };
						delete messagesToFilter[id];
						set({
							workspaces: updateWorkspaceHelper(state, {
								...activeWorkspace,
								nodes: updatedNodes,
								edges: activeWorkspace.edges.filter(
									(edge) => edge.source !== id && edge.target !== id
								),
								messages: messagesToFilter,
							}),
						});
					},
					createNoteNode() {
						const state = get();
						if (state.workspaces.length === 0) return;
						const activeWorkspace = activeWorkspaceHelper(state);
						if (!activeWorkspace) return;
						const nodesSnapshot = activeWorkspace.nodes;
						const newNoteNode: AppNode = {
							id: crypto.randomUUID(),
							type: "note",
							position: { x: 0, y: 0 },
							data: { title: "New Note", description: "" },
						};
						const updatedNodes = [...nodesSnapshot, newNoteNode];
						set({
							workspaces: updateWorkspaceHelper(state, {
								...activeWorkspace,
								nodes: updatedNodes,
							}),
						});
					},
					createSubtopicNode() {
						const state = get();
						if (state.workspaces.length === 0) return;
						const activeWorkspace = activeWorkspaceHelper(state);
						if (!activeWorkspace) return;
						const nodesSnapshot = activeWorkspace.nodes;
						const newSubtopicNode: AppNode = {
							id: crypto.randomUUID(),
							type: "subtopic",
							position: { x: 0, y: 0 },
							data: { title: "New Subtopic" },
						};
						const updatedNodes = [...nodesSnapshot, newSubtopicNode];
						set({
							workspaces: updateWorkspaceHelper(state, {
								...activeWorkspace,
								nodes: updatedNodes,
							}),
						});
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
									nodeChatSummaries: {},
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

						const relationType = state.currentRelationType;

						const newEdge = {
							id: crypto.randomUUID(),
							source: connection.source,
							target: connection.target,
							sourceHandle: connection.sourceHandle,
							targetHandle: connection.targetHandle,
							type: "mindmap",
							data: { relationType },
						};

						const updatedWorkspace = {
							...activeWorkspace,
							edges: [...activeWorkspace.edges, newEdge],
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
	)
);
