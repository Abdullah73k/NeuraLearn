"use client";

import { IconDatabase, IconFileWord, IconReport } from "@tabler/icons-react";
import { NavWorkspaces } from "./workspaces-container";
import { NavUser } from "./nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
} from "@/components/ui/sidebar";

const data = {
	user: {
		name: "shadcn",
		email: "m@example.com",
		avatar: "/avatars/shadcn.jpg",
	},
	documents: [
		{
			name: "Data Library",
			url: "#",
			icon: IconDatabase,
		},
		{
			name: "Reports",
			url: "#",
			icon: IconReport,
		},
		{
			name: "Word Assistant",
			url: "#",
			icon: IconFileWord,
		},
	],
};

export function BrainGraphHistorySidebar() {
	return (
		<Sidebar
			collapsible="none"
			className="sticky top-0 hidden h-svh border-l lg:flex"
			side="right"
		>
			<SidebarContent>
				<NavWorkspaces workspaces={[]} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={data.user} />
			</SidebarFooter>
		</Sidebar>
	);
}
