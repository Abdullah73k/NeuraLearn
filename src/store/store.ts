import { AppNode, NoteNode, RootNode, SubtopicNode } from "@/types/nodes";
import { MindMapStore, MindMapWorkspace } from "@/types/store.types";
import { applyNodeChanges, applyEdgeChanges } from "@xyflow/react";
import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import {
	activeWorkspaceHelper,
	updateWorkspaceHelper,
} from "../utils/store.utils";
import {
	calculateNewChildPosition,
	rebalanceTreeLayout,
	getTreeEdgeHandles,
	fixEdgeHandles,
} from "@/lib/tree-layout";
import { MindMapEdge } from "@/types/edges";

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
					async setRootNodeTitle(event) {
						const state = get();
						const activeWorkspace = activeWorkspaceHelper(state);
						if (!activeWorkspace) return;

						const activeWorkspaceRootNode = activeWorkspace.nodes.filter(
							(node) => node.type === "root"
						)[0];
						
						if (!activeWorkspaceRootNode) return;

						const newTitle = event.target.value;

						const updatedRootNode: RootNode = {
							...activeWorkspaceRootNode,
							data: {
								...activeWorkspaceRootNode.data,
								title: newTitle,
							},
						};
						const updatedWorkspace: MindMapWorkspace = {
							...activeWorkspace,
							title: newTitle, // Update workspace title too
							nodes: activeWorkspace.nodes.map((node) =>
								node.id === activeWorkspaceRootNode.id ? updatedRootNode : node
							),
						};

						set({ workspaces: updateWorkspaceHelper(state, updatedWorkspace) });

						// Update in MongoDB (both topic and node)
						try {
							await Promise.all([
								// Update topic title
								fetch(`/api/graph/topics/${activeWorkspace.id}`, {
									method: "PATCH",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({ title: newTitle }),
								}),
								// Update node title
								fetch(`/api/graph/nodes/${activeWorkspaceRootNode.id}`, {
									method: "PATCH",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({ title: newTitle }),
								}),
							]);
						} catch (error) {
							console.error("Failed to update root node title in DB:", error);
						}
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
				async deleteNode(id) {
					const state = get();
					if (state.workspaces.length === 0) return;
					const activeWorkspace = activeWorkspaceHelper(state);
					if (!activeWorkspace) return;

					// Find the node to check if it's a root node
					const nodeToDelete = activeWorkspace.nodes.find((node) => node.id === id);
					if (!nodeToDelete) return;

					// Prevent deletion of root nodes (they should use deleteWorkspace instead)
					if (nodeToDelete.type === "root") {
						console.error("Cannot delete root node directly. Use deleteWorkspace instead.");
						return;
					}

					try {
						// Delete from MongoDB first
						const response = await fetch(`/api/graph/nodes/${id}`, {
							method: "DELETE",
						});

						if (!response.ok) {
							const error = await response.json();
							console.error("Failed to delete node from MongoDB:", error);
							return;
						}

						const data = await response.json();
						const deletedIds = data.deleted_ids || [id];

						// Update local state - remove node and all its descendants
						const nodesSnapshot = activeWorkspace.nodes;
						const updatedNodes = nodesSnapshot.filter((node) => !deletedIds.includes(node.id));
						
						// Clean up messages for deleted nodes
						const messagesToFilter = { ...activeWorkspace.messages };
						deletedIds.forEach((nodeId: string) => {
							delete messagesToFilter[nodeId];
						});

						set({
							workspaces: updateWorkspaceHelper(state, {
								...activeWorkspace,
								nodes: updatedNodes,
								edges: activeWorkspace.edges.filter(
									(edge) => !deletedIds.includes(edge.source) && !deletedIds.includes(edge.target)
								),
								messages: messagesToFilter,
							}),
						});
					} catch (error) {
						console.error("Failed to delete node:", error);
					}
					},
					createNoteNode() {
						const state = get();
						if (state.workspaces.length === 0) return;
						const activeWorkspace = activeWorkspaceHelper(state);
						if (!activeWorkspace) return;

						// Use the selected node as parent, or fall back to root node
						const parentNode = state.selectedNode || activeWorkspace.nodes.find(n => n.type === "root");
						
						let newPosition = { x: 250, y: 250 };
						let newEdge: MindMapEdge | null = null;

						if (parentNode) {
							// Calculate position using tree layout (below parent)
							newPosition = calculateNewChildPosition(
								parentNode,
								activeWorkspace.nodes,
								activeWorkspace.edges as MindMapEdge[]
							);

							// Get proper handles for tree layout (bottom -> top)
							const { sourceHandle, targetHandle } = getTreeEdgeHandles(
								parentNode,
								{ type: "note" } as AppNode
							);

							newEdge = {
								id: crypto.randomUUID(),
								source: parentNode.id,
								target: crypto.randomUUID(), // Will be replaced below
								sourceHandle,
								targetHandle,
								type: "mindmap",
								data: { relationType: state.currentRelationType },
							};
						}

						const nodeId = newEdge ? newEdge.target : crypto.randomUUID();
						if (newEdge) {
							newEdge.target = nodeId;
						}

						const newNoteNode: AppNode = {
							id: nodeId,
							type: "note",
							position: newPosition,
							data: { title: "New Note", description: "" },
						};

						const updatedNodes = [...activeWorkspace.nodes, newNoteNode];
						const updatedEdges = newEdge 
							? [...activeWorkspace.edges, newEdge]
							: activeWorkspace.edges;

						set({
							workspaces: updateWorkspaceHelper(state, {
								...activeWorkspace,
								nodes: updatedNodes,
								edges: updatedEdges,
							}),
						});
					},
					createNoteNodeOnTarget(targetNodeId: string, noteTitle: string, noteContent: string) {
						const state = get();
						if (state.workspaces.length === 0) return;
						const activeWorkspace = activeWorkspaceHelper(state);
						if (!activeWorkspace) return;

						// Find the target node
						const targetNode = activeWorkspace.nodes.find(n => n.id === targetNodeId);
						if (!targetNode) {
							console.error("Target node not found:", targetNodeId);
							return;
						}

						// Calculate position (offset from target node)
						const newPosition = {
							x: targetNode.position.x + 200,
							y: targetNode.position.y + 50,
						};

						const nodeId = crypto.randomUUID();

						// Create edge from target to note
						const newEdge: MindMapEdge = {
							id: crypto.randomUUID(),
							source: targetNodeId,
							target: nodeId,
							sourceHandle: targetNode.type === "root" ? "root-right" : "subtopic-right",
							targetHandle: "note-left-target",
							type: "mindmap",
							data: { relationType: "background" },
						};

						const newNoteNode: AppNode = {
							id: nodeId,
							type: "note",
							position: newPosition,
							data: { title: noteTitle, description: noteContent },
						};

						set({
							workspaces: updateWorkspaceHelper(state, {
								...activeWorkspace,
								nodes: [...activeWorkspace.nodes, newNoteNode],
								edges: [...activeWorkspace.edges, newEdge],
							}),
						});
					},
					async createSubtopicNode() {
						const state = get();
						if (state.workspaces.length === 0) return;
						const activeWorkspace = activeWorkspaceHelper(state);
						if (!activeWorkspace) return;

						// Use the selected node as parent, or fall back to root node
						const parentNode = state.selectedNode || activeWorkspace.nodes.find(n => n.type === "root");
						if (!parentNode) return;

						try {
							// Create node in MongoDB first
							const response = await fetch("/api/graph/nodes", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify({
									title: "New Subtopic",
									summary: "A new subtopic to explore",
									parent_id: parentNode.id,
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

							// Calculate position using tree layout (below parent)
							const newPosition = calculateNewChildPosition(
								parentNode,
								activeWorkspace.nodes,
								activeWorkspace.edges as MindMapEdge[]
							);

							// Get proper handles for tree layout (bottom -> top)
							const { sourceHandle, targetHandle } = getTreeEdgeHandles(
								parentNode,
								{ type: "subtopic" } as AppNode
							);

							// Find root node for metadata
							const rootNode = activeWorkspace.nodes.find(n => n.type === "root");

							// Create the new node with metadata
							const newSubtopicNode: AppNode = {
								id: nodeId,
								type: "subtopic",
								position: newPosition,
								data: { 
									title: data.node.title,
									metadata: {
										createdAt: data.node.created_at || new Date().toISOString(),
										summary: data.node.summary || "A new subtopic to explore",
										parentId: parentNode.id,
										parentTitle: parentNode.data.title,
										rootId: rootNode?.id,
										rootTitle: rootNode?.data.title,
										origin: "user",
										tags: data.node.tags || [],
									},
								},
							};

							// Create edge connecting parent to child with proper handles
							const newEdge: MindMapEdge = {
								id: crypto.randomUUID(),
								source: parentNode.id,
								target: nodeId,
								sourceHandle,
								targetHandle,
								type: "mindmap",
								data: { relationType: state.currentRelationType },
							};

							const updatedNodes = [...activeWorkspace.nodes, newSubtopicNode];
							const updatedEdges = [...activeWorkspace.edges, newEdge];

							set({
								workspaces: updateWorkspaceHelper(state, {
									...activeWorkspace,
									nodes: updatedNodes,
									edges: updatedEdges,
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
												data: { 
													title: data.topic.title,
													metadata: {
														createdAt: data.topic.created_at || new Date().toISOString(),
														summary: `Root topic for ${data.topic.title}`,
														parentId: null,
														rootId: newWorkspaceId,
														rootTitle: data.topic.title,
														origin: "user",
														tags: [],
													},
												},
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
					async deleteWorkspace(id: string) {
						try {
							// Delete from MongoDB first
							const response = await fetch(`/api/graph/topics/${id}`, {
								method: "DELETE",
							});

							if (!response.ok) {
								const error = await response.json();
								console.error("Failed to delete workspace from MongoDB:", error);
								return;
							}

							// Update local state
							set((state) => ({
								workspaces: state.workspaces.filter(
									(workspace) => workspace.id !== id
								),
								activeWorkspaceId: state.activeWorkspaceId === id ? null : state.activeWorkspaceId,
							}));
						} catch (error) {
							console.error("Failed to delete workspace:", error);
						}
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
									
									// The topic itself is the root - use topic data for root info
									const rootTitle = topicData.topic?.title || topic.title;
									const rootId = topicData.topic?.id || topic.id;

									// Convert DB nodes to AppNodes with metadata
									const appNodes: AppNode[] = nodes.map((node: any) => {
										const isRoot = node.parent_id === null;
										
										// Find parent node title for metadata
										const parentNode = nodes.find((n: any) => n.id === node.parent_id);

										return {
											id: node.id,
											type: isRoot ? "root" : "subtopic",
											position: node.position || { x: 0, y: 0 }, // Use saved position or default
											data: { 
												title: node.title,
												metadata: {
													createdAt: node.created_at,
													summary: node.summary,
													parentId: node.parent_id,
													parentTitle: parentNode?.title,
													rootId: rootId,
													rootTitle: rootTitle,
													origin: "user", // Default to user created
													tags: node.tags || [],
												},
											},
										};
									});

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

						// Persist position changes to database
						changes.forEach((change) => {
							if (change.type === "position" && change.position && !change.dragging) {
								// Only save when drag ends (dragging = false)
								fetch(`/api/graph/nodes/${change.id}`, {
									method: "PATCH",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({ position: change.position }),
								}).catch((err) => console.error("Failed to save node position:", err));
							}
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
					rebalanceLayout() {
						const state = get();
						if (state.workspaces.length === 0) return;

						const activeWorkspace = activeWorkspaceHelper(state);
						if (!activeWorkspace) return;

						// Rebalance tree layout for all nodes
						const rebalancedNodes = rebalanceTreeLayout(
							activeWorkspace.nodes,
							activeWorkspace.edges as MindMapEdge[]
						);

						// Fix edge handles to use proper tree connections (bottom -> top)
						const fixedEdges = fixEdgeHandles(
							activeWorkspace.edges as MindMapEdge[],
							activeWorkspace.nodes
						);

						const updatedWorkspace = {
							...activeWorkspace,
							nodes: rebalancedNodes,
							edges: fixedEdges,
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
