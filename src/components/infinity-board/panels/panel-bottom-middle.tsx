"use client";

import { Menubar } from "@/components/ui/menubar";
import { Panel } from "@xyflow/react";
import { useMindMapStore } from "@/store/store";
import MenubarOption from "./menubar-option";

export default function PanelBottomMiddle() {
	const selectedNode = useMindMapStore((state) => state.selectedNode);
	return (
		<Panel position="bottom-center">
			<Menubar className="py-4">
				{selectedNode && selectedNode.type === "note" ? null : (
					<>
						<MenubarOption option="Add Handle" />
						<MenubarOption option="Delete Handle" />
					</>
				)}
				<MenubarOption option="Delete Node" />
			</Menubar>
		</Panel>
	);
}
