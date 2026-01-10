"use client";

import {
	Menubar,
	MenubarCheckboxItem,
	MenubarContent,
	MenubarItem,
	MenubarMenu,
	MenubarRadioGroup,
	MenubarRadioItem,
	MenubarSeparator,
	MenubarShortcut,
	MenubarTrigger,
} from "@/components/ui/menubar";
import { Panel } from "@xyflow/react";
import MenuBarOption from "./panel-option";
import { useMindMapStore } from "@/store/store";

export default function PanelBottomMiddle() {
	const selectedNode = useMindMapStore((state) => state.selectedNode);
	return (
		<Panel position="bottom-center">
			<Menubar className="py-4">
				{selectedNode && selectedNode.type === "note" ? null : (
					<>
						<MenuBarOption option="Add Handle" />
						<MenuBarOption option="Delete Handle" />
					</>
				)}
				<MenuBarOption option="Delete Node" />
				<MenubarMenu>
					<MenubarTrigger>View</MenubarTrigger>
					<MenubarContent>
						<MenubarCheckboxItem>Always Show Bookmarks Bar</MenubarCheckboxItem>
						<MenubarCheckboxItem checked>
							Always Show Full URLs
						</MenubarCheckboxItem>
						<MenubarSeparator />
						<MenubarItem inset>
							Reload <MenubarShortcut>⌘R</MenubarShortcut>
						</MenubarItem>
						<MenubarItem disabled inset>
							Force Reload <MenubarShortcut>⇧⌘R</MenubarShortcut>
						</MenubarItem>
						<MenubarSeparator />
						<MenubarItem inset>Toggle Fullscreen</MenubarItem>
						<MenubarSeparator />
						<MenubarItem inset>Hide Sidebar</MenubarItem>
					</MenubarContent>
				</MenubarMenu>
				<MenubarMenu>
					<MenubarTrigger>Profiles</MenubarTrigger>
					<MenubarContent>
						<MenubarRadioGroup value="benoit">
							<MenubarRadioItem value="andy">Andy</MenubarRadioItem>
							<MenubarRadioItem value="benoit">Benoit</MenubarRadioItem>
							<MenubarRadioItem value="Luis">Luis</MenubarRadioItem>
						</MenubarRadioGroup>
						<MenubarSeparator />
						<MenubarItem inset>Edit...</MenubarItem>
						<MenubarSeparator />
						<MenubarItem inset>Add Profile...</MenubarItem>
					</MenubarContent>
				</MenubarMenu>
			</Menubar>
		</Panel>
	);
}
