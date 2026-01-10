import { Menubar } from "@/components/ui/menubar";
import { Panel } from "@xyflow/react";
import MenubarOption from "./menubar-option";

export default function PanelTopMiddle() {
	return (
		<Panel position="top-center">
			<Menubar className="py-4">
				<MenubarOption option="Add Node" />
				<MenubarOption option="Add Handle" />
			</Menubar>
		</Panel>
	);
}
