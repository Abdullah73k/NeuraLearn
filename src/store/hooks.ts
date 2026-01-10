import { activeWorkspaceHelper } from "@/utils/store.utils";
import { useMindMapStore } from "./store";

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

export const useGetSelectedNode = () =>
	useMindMapStore((state) => state.selectedNode);

export const useIsChatBarOpen = () =>
	useMindMapStore((state) => state.isChatBarOpen);

export const useGetActiveWorkspace = () =>
	useMindMapStore((state) => activeWorkspaceHelper(state));

export const useGetWorkspaces = () =>
	useMindMapStore((state) => state.workspaces);
