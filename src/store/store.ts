import { AppNode } from "@/types/nodes";
import { UIMessage } from "ai";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type WorkSpaceNode = {
	node: AppNode;
	messages: UIMessage[]; // placeholder for when i get
};

type MindMapWorkspace = {
	title: string;
	nodes: WorkSpaceNode[];
};

type MindMapActions = {
	setSelectedNode: (node: AppNode | null) => void;
	setIsChatBarOpen: () => void;
};

type MindMapStore = {
	selectedNode: AppNode | null;
	chatNodes: AppNode[] | null;
	isChatBarOpen: boolean;
	actions: MindMapActions;
	workspaces: MindMapWorkspace[] | null;
};

export const useMindMapStore = create<MindMapStore>()(
	persist(
		(set) => ({
			selectedNode: null,
			chatNodes: null,
			isChatBarOpen: false,
			workspaces: null,
			actions: {
				setSelectedNode(node: AppNode | null) {
					set({ selectedNode: node });
				},
				setIsChatBarOpen() {
					set((state) => ({ isChatBarOpen: !state.isChatBarOpen }));
				},
			},
		}),
		{
			name: "mind-map-state",
			partialize: (state) => ({
				selectedNode: state.selectedNode,
				isChatBarOpen: state.isChatBarOpen,
				chatNodes: state.chatNodes,
			}),
		}
	)
);
