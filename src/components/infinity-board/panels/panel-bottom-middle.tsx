"use client";

import { Menubar } from "@/components/ui/menubar";
import { Panel } from "@xyflow/react";
import GlobalMic from "@/components/global-mic/global-mic";

export default function PanelBottomMiddle() {
	return (
		<Panel position="bottom-center">
			<GlobalMic />
		</Panel>
	);
}
