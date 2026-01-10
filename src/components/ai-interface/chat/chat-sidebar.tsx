import * as React from "react";
import AppIcon from "@public/icon.png";

import {
	Sidebar,
	SidebarContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import Chat from "./chat";
import Image from "next/image";

export function ChatSidebar() {
	return (
		<Sidebar variant="floating">
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<header>
								<div className=" text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
									<Image
										src={AppIcon.src}
										alt="Brain Graph Logo"
										width={32}
										height={32}
									/>
								</div>
								<div className="flex flex-col gap-0.5 leading-none">
									<span className="font-medium">Brain Graph AI</span>
									<span className="">v1.0.0</span>
								</div>
							</header>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<Chat />
			</SidebarContent>
		</Sidebar>
	);
}
