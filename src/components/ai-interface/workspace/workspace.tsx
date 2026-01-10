import {
	SidebarMenuItem,
	SidebarMenuButton,
	SidebarMenuAction,
} from "@/components/ui/sidebar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconDots, IconTrash } from "@tabler/icons-react";

export default function Workspace({
	key,
	id,
	name,
	isMobile,
}: {
	key: string;
	id: string;
	name: string;
	isMobile: boolean;
}) {
	return (
		<>
			<SidebarMenuItem key={key}>
				<SidebarMenuButton>
					<span>{name}</span>
				</SidebarMenuButton>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuAction className="data-[state=open]:bg-accent rounded-sm">
							<IconDots />
						</SidebarMenuAction>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-24 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align={isMobile ? "end" : "start"}
					>
						<DropdownMenuItem variant="destructive">
							<IconTrash />
							<span>Delete</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</>
	);
}
