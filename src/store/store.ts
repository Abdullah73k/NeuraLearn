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
					async setSubTopicNodeTitle(event, id) {
						const state = get();
						const activeWorkspace = activeWorkspaceHelper(state);
						if (!activeWorkspace) return;

						const subtopicNode = activeWorkspace.nodes.find(
							(node) => node.id === id
						) as SubtopicNode;

						if (!subtopicNode) return;

						const newTitle = event.target.value;

						const updatedSubtopicNode: SubtopicNode = {
							...subtopicNode,
							data: {
								...subtopicNode.data,
								title: newTitle,
							},
						};

						const updatedWorkspace: MindMapWorkspace = {
							...activeWorkspace,
							nodes: activeWorkspace.nodes.map((node) =>
								node.id === id ? updatedSubtopicNode : node
							),
						};

						set({ workspaces: updateWorkspaceHelper(state, updatedWorkspace) });

						// Update in MongoDB
						try {
							await fetch(`/api/graph/nodes/${id}`, {
								method: "PATCH",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({ title: newTitle }),
							});
						} catch (error) {
							console.error("Failed to update node title in DB:", error);
						}
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
					addMessageToNode(nodeId, message) {
						const state = get();
						if (state.workspaces.length === 0) return;
						const activeWorkspace = activeWorkspaceHelper(state);
						if (!activeWorkspace) return;
						const existingMessages = activeWorkspace.messages[nodeId] || [];
						const updatedWorkspace: MindMapWorkspace = {
							...activeWorkspace,
							messages: {
								...activeWorkspace.messages,
								[nodeId]: [...existingMessages, message],
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
					async createSubtopicNode() {
						const state = get();
						if (state.workspaces.length === 0) return;
						const activeWorkspace = activeWorkspaceHelper(state);
						if (!activeWorkspace) return;

						// Use the root node as parent
						const rootNode = activeWorkspace.nodes.find(n => n.type === "root");
						if (!rootNode) return;

						try {
							// Create node in MongoDB first
							const response = await fetch("/api/graph/nodes", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									title: "New Subtopic",
									summary: "A new subtopic to explore",
									parent_id: rootNode.id,
									tags: [],
								}),
							});

							if (!response.ok) {
								const error = await response.json();
								console.error("Failed to create node:", error);
								return;
							}

							const data = await response.json();
							const nodeId = data.node.id;

							// Add to local state
							const newSubtopicNode: AppNode = {
								id: nodeId,
								type: "subtopic",
								position: { x: 0, y: 0 },
								data: { title: data.node.title },
							};

							const updatedNodes = [...activeWorkspace.nodes, newSubtopicNode];
							set({
								workspaces: updateWorkspaceHelper(state, {
									...activeWorkspace,
									nodes: updatedNodes,
								}),
							});
						} catch (error) {
							console.error("Failed to create subtopic node:", error);
						}
					},
					async createWorkspace() {
						try {
							// Fetch existing topics from MongoDB to check for duplicate titles
							const existingTopicsResponse = await fetch("/api/graph/topics");
							const existingTopicsData = await existingTopicsResponse.json();
							
							const existingTitles = new Set<string>();
							if (existingTopicsData.success && existingTopicsData.topics) {
								existingTopicsData.topics.forEach((topic: { title: string }) => {
									existingTitles.add(topic.title.toLowerCase());
								});
							}
							
							// Generate a unique title
							let title = "Main Topic of This Mindspace";
							let counter = 1;
							
							// If the default title exists, try incrementing counter
							if (existingTitles.has(title.toLowerCase())) {
								do {
									counter++;
									title = `New Mindspace ${counter}`;
								} while (existingTitles.has(title.toLowerCase()));
							}
							
							// Create topic in MongoDB
							const response = await fetch("/api/graph/topics", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									title,
									description: `Learn about ${title}`,
								}),
							});

							const data = await response.json();
							
							if (!response.ok) {
								console.error("Failed to create topic:", data.error || data);
								return;
							}

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

								// Load messages for each node
								const messages: Record<string, any[]> = {};
								await Promise.all(
									nodes.map(async (node: any) => {
										try {
											const interactionsRes = await fetch(`/api/graph/nodes/${node.id}/interactions`);
											if (interactionsRes.ok) {
												const interactionsData = await interactionsRes.json();
												const interactions = interactionsData.interactions || [];
												
												// Convert to UIMessage format
												const uiMessages = interactions.flatMap((interaction: any) => [
													{
														id: crypto.randomUUID(),
														role: "user",
														parts: [{ type: "text", text: interaction.user_message }],
													},
													{
														id: crypto.randomUUID(),
														role: "assistant",
														parts: [{ type: "text", text: interaction.ai_response }],
													},
												]);
												
												if (uiMessages.length > 0) {
													messages[node.id] = uiMessages;
												}
											}
										} catch (e) {
											console.error(`Failed to load messages for node ${node.id}:`, e);
										}
									})
								);

								return {
									id: topic.id,
									title: topic.title,
									nodes: appNodes,
									edges,
									messages,
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
