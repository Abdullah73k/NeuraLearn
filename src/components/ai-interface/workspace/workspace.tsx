"use client";

import { useState } from "react";
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
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconDots, IconTrash, IconEdit } from "@tabler/icons-react";
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
	const { deleteWorkspace, setActiveWorkspace, renameWorkspace } =
		useMindMapActions();
	const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
	const [newTitle, setNewTitle] = useState(title);

	const handleRename = () => {
		if (newTitle.trim() && newTitle !== title) {
			renameWorkspace(id, newTitle);
		}
		setIsRenameDialogOpen(false);
	};

	const handleOpenRenameDialog = () => {
		setNewTitle(title);
		setIsRenameDialogOpen(true);
	};

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
						className="w-32 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align={isMobile ? "end" : "start"}
					>
						<DropdownMenuItem
							onClick={(e) => {
								e.stopPropagation();
								handleOpenRenameDialog();
							}}
							className="cursor-pointer"
						>
							<IconEdit />
							<span>Rename</span>
						</DropdownMenuItem>
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

			<Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
				<DialogContent onClick={(e) => e.stopPropagation()}>
					<DialogHeader>
						<DialogTitle>Rename Workspace</DialogTitle>
					</DialogHeader>
					<Input
						value={newTitle}
						onChange={(e) => setNewTitle(e.target.value)}
						placeholder="Enter new workspace name"
						autoFocus
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								handleRename();
							} else if (e.key === "Escape") {
								setIsRenameDialogOpen(false);
							}
						}}
					/>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsRenameDialogOpen(false)}
						>
							Cancel
						</Button>
						<Button onClick={handleRename}>Rename</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
