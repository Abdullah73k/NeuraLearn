import {
	Menubar,
	MenubarContent,
	MenubarItem,
	MenubarMenu,
	MenubarTrigger,
} from "@/components/ui/menubar";
import { Panel } from "@xyflow/react";
import MenubarOption from "./menubar-option";
import { useGetCurrentRelationType, useGetSelectedNode, useMindMapActions } from "@/store/hooks";
import { relations, RelationType } from "@/types/edges";

export default function PanelTopMiddle() {
	const currentRelationType = useGetCurrentRelationType();
	const selectedNode = useGetSelectedNode();
	const { createSubtopicNode, createNoteNode, setCurrentRelationType, deleteNode } =
		useMindMapActions();
	
	// Determine if delete button should be disabled
	const isDeleteDisabled = !selectedNode || selectedNode.type === "root";
	
	return (
		<Panel position="top-center">
			<Menubar className="py-4">
				<MenubarOption option="Add Node" onClick={createSubtopicNode} />
				<MenubarOption option="Add Note" onClick={createNoteNode} />
				<MenubarOption 
					option="Delete Node" 
					onClick={() => {
						if (selectedNode && selectedNode.type !== "root") {
							deleteNode(selectedNode.id);
						}
					}}
					disabled={isDeleteDisabled}
				/>
				<MenubarMenu>
					<MenubarTrigger>Node Relations</MenubarTrigger>
					<MenubarContent>
						{relations.map((relation) => (
							<MenubarItem
								key={relation}
								onClick={() =>
									setCurrentRelationType(relation.toLowerCase() as RelationType)
								}
								className={
									currentRelationType === relation.toLowerCase()
										? "bg-primary text-primary-foreground"
										: ""
								}
							>
								{relation[0].toUpperCase() + relation.slice(1)}
							</MenubarItem>
						))}
					</MenubarContent>
				</MenubarMenu>
			</Menubar>
		</Panel>
	);
}
