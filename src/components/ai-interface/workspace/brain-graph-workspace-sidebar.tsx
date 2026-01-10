"use client";

import { WorkspacesContainer } from "./workspaces-container";
import { NavUser } from "./nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
} from "@/components/ui/sidebar";
import { useMindMapActions, useGetWorkspaces } from "@/store/hooks";
import { Button } from "@/components/ui/button";

const data = {
	user: {
		name: "shadcn",
		email: "m@example.com",
		avatar: "/avatars/shadcn.jpg",
	},
};

export function BrainGraphHistorySidebar() {
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
			<SidebarFooter>
				<NavUser user={data.user} />
			</SidebarFooter>
		</Sidebar>
	);
}
