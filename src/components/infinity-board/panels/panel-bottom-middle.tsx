"use client";

import { Menubar } from "@/components/ui/menubar";
import { Panel } from "@xyflow/react";
import { useMindMapStore } from "@/store/store";
import MenubarOption from "./menubar-option";
import { useMindMapActions } from "@/store/hooks";

export default function PanelBottomMiddle() {
	const selectedNode = useMindMapStore((state) => state.selectedNode);
	const { deleteNode } = useMindMapActions();
	return (
		<Panel position="bottom-center">
			<Menubar className="py-4">
				{selectedNode && (
					<MenubarOption
						option="Delete Node"
						onClick={() => deleteNode(selectedNode.id)}
					/>
				)}
			</Menubar>
		</Panel>
	);
}
