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
					async createWorkspace() {
						const title = "Main Topic of This Mindspace";
						
						try {
							// Create topic in MongoDB first
							const response = await fetch("/api/graph/topics", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									title,
									description: `Learn about ${title}`,
								}),
							});

							if (!response.ok) {
								const error = await response.json();
								console.error("Failed to create topic:", error);
								return;
							}

							const data = await response.json();
							const newWorkspaceId = data.topic.id;

							// Add to local state
							set((state) => ({
								workspaces: [
									...state.workspaces,
									{
										id: newWorkspaceId,
										title: data.topic.title,
										nodes: [
											{
												id: newWorkspaceId,
												type: "root",
												position: { x: 0, y: 0 },
												data: { title: data.topic.title },
											},
										],
										edges: [],
										messages: {},
										nodeChatSummaries: {},
									},
								],
								activeWorkspaceId: newWorkspaceId,
							}));
						} catch (error) {
							console.error("Failed to create workspace:", error);
						}
					},
					deleteWorkspace(id: string) {
						set((state) => ({
							workspaces: state.workspaces.filter(
								(workspace) => workspace.id !== id
							),
							activeWorkspaceId: null,
						}));
					},
					renameWorkspace(id: string, newTitle: string) {
						set((state) => ({
							workspaces: state.workspaces.map((workspace) =>
								workspace.id === id
									? { ...workspace, title: newTitle }
									: workspace
							),
						}));
					},
					setActiveWorkspace(id: string) {
						set(() => ({
							activeWorkspaceId: id,
						}));
					},
					async loadWorkspacesFromDb() {
						try {
							const response = await fetch("/api/graph/topics");
							if (!response.ok) return;

							const data = await response.json();
							const topics = data.topics || [];

							// Convert topics to workspaces
							const workspaces: MindMapWorkspace[] = await Promise.all(
								topics.map(async (topic: any) => {
									// Fetch full topic tree
									const topicResponse = await fetch(`/api/graph/topics/${topic.id}`);
									if (!topicResponse.ok) {
										return {
											id: topic.id,
											title: topic.title,
											nodes: [
												{
													id: topic.id,
													type: "root" as const,
													position: { x: 0, y: 0 },
													data: { title: topic.title },
												},
											],
											edges: [],
											messages: {},
											nodeChatSummaries: {},
										};
									}

									const topicData = await topicResponse.json();
									const nodes = topicData.nodes || [];
									const edges = topicData.edges || [];

									// Convert DB nodes to AppNodes
									const appNodes: AppNode[] = nodes.map((node: any) => ({
										id: node.id,
										type: node.parent_id === null ? "root" : "subtopic",
										position: { x: 0, y: 0 }, // Layout handled by ReactFlow
										data: { title: node.title },
									}));

									return {
										id: topic.id,
										title: topic.title,
										nodes: appNodes,
										edges,
										messages: {},
										nodeChatSummaries: {},
									};
								})
							);

							set({ workspaces });
						} catch (error) {
							console.error("Failed to load workspaces:", error);
						}
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
