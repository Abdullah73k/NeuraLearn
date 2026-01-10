"use client";

import { WorkspacesContainer } from "./workspaces-container";
import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
} from "@/components/ui/sidebar";
import { useMindMapActions, useGetWorkspaces } from "@/store/hooks";
import { Button } from "@/components/ui/button";

export function WorkspacesSidebar() {
	const { createWorkspace } = useMindMapActions();
	const workspaces = useGetWorkspaces();
	return (
		<Sidebar
			collapsible="none"
			className="sticky top-0 hidden h-svh border-l lg:flex max-w-47"
			side="right"
		>
			<SidebarHeader>
				<Button
					onClick={() => {
						createWorkspace();
					}}
					className="cursor-pointer"
				>
					Add Workspace
				</Button>
			</SidebarHeader>
			<SidebarContent>
				<WorkspacesContainer workspaces={workspaces} />
			</SidebarContent>
		</Sidebar>
	);
}
