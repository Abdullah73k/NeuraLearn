"use client";

import { WorkspacesContainer } from "./workspaces-container";
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
} from "@/components/ui/sidebar";
import { useMindMapActions, useGetWorkspaces } from "@/store/hooks";
import { RainbowButton } from "@/components/ui/rainbow-button";

export function WorkspacesSidebar() {
	const { createWorkspace } = useMindMapActions();
	const workspaces = useGetWorkspaces();
	return (
		<Sidebar
			variant="floating"
			side="right"
			collapsible="offcanvas"
		>
			<SidebarHeader>
				<RainbowButton
					onClick={() => {
						createWorkspace();
					}}
				>
					Add Workspace
				</RainbowButton>
			</SidebarHeader>
			<SidebarContent>
				<WorkspacesContainer workspaces={workspaces} />
			</SidebarContent>
		</Sidebar>
	);
}
