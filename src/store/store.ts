import { AppNode } from "@/types/nodes";
import { create } from "zustand";

type MindMapActions = {
	setSelectedNode: (node: AppNode | null) => void;
	setIsChatBarOpen: () => void;
};

type MindMapStore = {
	selectedNode: AppNode | null;
	chatNodes: AppNode[] | null;
	isChatBarOpen: boolean;
	actions: MindMapActions;
};

export const useMindMapStore = create<MindMapStore>((set) => ({
	selectedNode: null,
	chatNodes: null,
	isChatBarOpen: false,
	actions: {
		setSelectedNode(node: AppNode | null) {
			set({ selectedNode: node });
		},
		setIsChatBarOpen() {
			set((state) => ({ isChatBarOpen: !state.isChatBarOpen }));
		},
	},
}));
