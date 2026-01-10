import { AppNode } from "@/types/nodes";
import { create } from "zustand";

type MindMapActions = {
	setSelectedNode: (node: AppNode) => void;
};

type MindMapStore = {
	selectedNode: AppNode | null;
	actions: MindMapActions;
};

export const useMindMapStore = create<MindMapStore>((set) => ({
	selectedNode: null,
	actions: {
		setSelectedNode(node: AppNode) {
			set({ selectedNode: node });
		},
	},
}));

/**
 * Custom hook which holds all actions.
 * Use to get access to actions object
 * Destructure required action function
 * 
 * 
 * @returns actions for mind map store.
 */
export const useMindMapActions = () =>
	useMindMapStore((state) => state.actions);
