import { activeWorkspaceHelper } from "@/utils/store.utils";
import { useMindMapStore } from "./store";
import { Edge } from "@xyflow/react";

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

export const useGetCurrentRelationType = () =>
	useMindMapStore((state) => state.currentRelationType);

export const useGetSelectedNodeEdges = () => {
	const selectedNode = useGetSelectedNode();
	const activeWorkspace = useGetActiveWorkspace();

	if (!selectedNode || !activeWorkspace) return [];

	const edges = activeWorkspace.edges.filter((edge) => {
		return edge.source === selectedNode.id || edge.target === selectedNode.id;
	});
	return edges as Edge[];
};

export const useGetNodeChatMessages = () => {
	const selectedNode = useGetSelectedNode();
	const activeWorkspace = useGetActiveWorkspace();

	if (!selectedNode || !activeWorkspace) return [];

	const messages = activeWorkspace.messages[selectedNode.id];
	return messages || [];
};

export const useGetRootNodeTitle = () => {
	const activeWorkspace = useGetActiveWorkspace();

	if (!activeWorkspace) return "Error";

	const rootNode = activeWorkspace.nodes.filter((node) => node.type === "root")

	const rootNodeTitle = rootNode[0].data.title

	return rootNodeTitle
}
	