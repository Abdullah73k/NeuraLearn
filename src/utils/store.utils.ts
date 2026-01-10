import { MindMapStore, MindMapWorkspace } from "@/types/store.types";

export const activeWorkspaceHelper = (state: MindMapStore) =>
	state.workspaces.find(
		(workspace) => workspace.id === state.activeWorkspaceId
	);

export const updateWorkspaceHelper = (
	state: MindMapStore,
	updatedWorkspace: MindMapWorkspace
) => {
	return state.workspaces.map((workspace) =>
		workspace.id === updatedWorkspace.id ? updatedWorkspace : workspace
	);
};
