import { Panel } from "@xyflow/react";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function PanelTopLeft() {
	return (
		<Panel position="top-left">
			<SidebarTrigger className="-ml-1" />
		</Panel>
	);
}
