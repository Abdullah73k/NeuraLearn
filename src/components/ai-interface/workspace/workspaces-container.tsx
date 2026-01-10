"use client";

import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	useSidebar,
} from "@/components/ui/sidebar";
import Workspaces from "./workspaces";
import { MindMapWorkspace } from "@/types/store.types";

export function WorkspacesContainer({
	workspaces,
}: {
	workspaces: MindMapWorkspace[];
}) {
	const { isMobile } = useSidebar();

	return (
		<SidebarGroup className="group-data-[collapsible=icon]:hidden">
			<SidebarGroupLabel className="font-mono text-cyan-500 text-md">
				Workspaces
			</SidebarGroupLabel>
			<SidebarMenu>
				<Workspaces
					workspaces={workspaces || []}
					isMobile={isMobile}
				/>
			</SidebarMenu>
		</SidebarGroup>
	);
}
