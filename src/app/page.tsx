"use client";

import { ChatSidebar } from "@/components/ai-interface/chat/chat-sidebar";
import InfinityBoard from "@/components/infinity-board/infinity-board";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useIsChatBarOpen, useMindMapActions } from "@/store/hooks";
import { BrainGraphHistorySidebar } from "@/components/ai-interface/workspace/brain-graph-workspace-sidebar";

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
			<ChatSidebar />
			<SidebarInset className="flex justify-center items-center">
				<InfinityBoard />
			</SidebarInset>
			<BrainGraphHistorySidebar />
		</SidebarProvider>
	);
}
