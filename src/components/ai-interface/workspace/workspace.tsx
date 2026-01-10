"use client";

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
import { useMindMapActions } from "@/store/hooks";

export default function Workspace({
	id,
	title,
	isMobile,
}: {
	id: string;
	title: string;
	isMobile: boolean;
}) {
	const { deleteWorkspace, setActiveWorkspace } = useMindMapActions();
	return (
		<>
			<SidebarMenuItem
				key={id}
				className="cursor-pointer"
				onClick={() => setActiveWorkspace(id)}
			>
				<SidebarMenuButton>
					<span>{title}</span>
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
						<DropdownMenuItem
							variant="destructive"
							onClick={() => {
								deleteWorkspace(id);
							}}
							className="cursor-pointer"
						>
							<IconTrash />
							<span>Delete</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</>
	);
}
