import { Plus } from "lucide-react";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
} from "@/components/ui/sidebar";

export function BrainGraphHistorySidebar() {
	return (
		<Sidebar
			collapsible="none"
			className="sticky top-0 hidden h-svh border-l lg:flex"
			side="right"
			variant="sidebar"
		>
			<SidebarHeader className="border-sidebar-border h-16 border-b">
				Nav User
			</SidebarHeader>
			<SidebarContent>
				Date Picker
				<SidebarSeparator className="mx-0" />
				Calendar
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton>
							<Plus />
							<span>New Calendar</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
}
