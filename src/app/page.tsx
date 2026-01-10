"use client";

import { AppSidebar } from "@/components/ai-interface/chat-sidebar";
import InfinityBoard from "@/components/infinity-board/infinity-board";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { useIsChatBarOpen, useMindMapActions } from "@/store/hooks";

export default function Page() {
	const isChatBarOpen = useIsChatBarOpen();
	const { setIsChatBarOpen } = useMindMapActions();
	return (
		<SidebarProvider
			style={
				{
					"--sidebar-width": "34rem",
				} as React.CSSProperties
			}
			open={isChatBarOpen}
			onOpenChange={setIsChatBarOpen}
		>
			<AppSidebar />
			<SidebarInset className="flex-1 h-full">
				<header className="flex h-16 shrink-0 items-center gap-2 px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator
						orientation="vertical"
						className="mr-2 data-[orientation=vertical]:h-4"
					/>
					<Breadcrumb>
						<BreadcrumbList>
							<BreadcrumbItem className="hidden md:block">
								<BreadcrumbLink href="#">
									Building Your Application
								</BreadcrumbLink>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
				</header>
				<InfinityBoard />
			</SidebarInset>
		</SidebarProvider>
	);
}
