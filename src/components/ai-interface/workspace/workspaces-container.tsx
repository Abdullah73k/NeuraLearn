"use client";

import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	useSidebar,
} from "@/components/ui/sidebar";
import Workspaces from "./workspaces";

export function NavWorkspaces({
	workspaces,
}: {
	workspaces: { id: string; name: string }[];
}) {
	const { isMobile } = useSidebar();

	return (
		<SidebarGroup className="group-data-[collapsible=icon]:hidden">
			<SidebarGroupLabel className="font-mono text-cyan-500 text-md">
				Workspaces
			</SidebarGroupLabel>
			<SidebarMenu>
				<Workspaces
					workspaces={workspaces ?? [{ id: "121212", name: "Workspace 1" }]}
					isMobile={isMobile}
				/>
			</SidebarMenu>
		</SidebarGroup>
	);
}
