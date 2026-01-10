import { AppNode } from "@/types/nodes";
import { UIMessage } from "ai";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type WorkSpaceNode = {
	node: AppNode;
	messages: UIMessage[]; // placeholder for when i get
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
};

type MindMapStore = {
	selectedNode: AppNode | null;
	isChatBarOpen: boolean;
	actions: MindMapActions;
	workspaces: MindMapWorkspace[];
};

export const useMindMapStore = create<MindMapStore>()(
	persist(
		(set) => ({
			selectedNode: null,
			isChatBarOpen: false,
			workspaces: [],
			actions: {
				setSelectedNode(node: AppNode | null) {
					set({ selectedNode: node });
				},
				setIsChatBarOpen() {
					set((state) => ({ isChatBarOpen: !state.isChatBarOpen }));
				},
				createWorkspace() {
					set((state) => ({
						workspaces: [
							...state.workspaces,
							{
								id: crypto.randomUUID(),
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
									},
								],
							},
						],
					}));
				},
				deleteWorkspace(id: string) {
					set((state) => ({
						workspaces: state.workspaces.filter((workspace) => workspace.id !== id),
					}));
				},
			},
		}),
		{
			name: "mind-map-state",
			partialize: (state) => ({
				selectedNode: state.selectedNode,
				isChatBarOpen: state.isChatBarOpen,
				workspaces: state.workspaces,
			}),
		}
	)
);
