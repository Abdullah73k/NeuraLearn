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

export const useGetChatNodes = () =>
	useMindMapStore((state) => state.chatNodes);

export const useIsChatBarOpen = () =>
	useMindMapStore((state) => state.isChatBarOpen);
