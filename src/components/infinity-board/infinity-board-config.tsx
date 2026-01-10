import { Background, Controls, MiniMap } from "@xyflow/react";
import { MenubarBottomMiddle } from "./menu-bar";
import { AppNode } from "@/types/nodes";

export default function InfinityBoardConfig({
	selectedNode,
}: {
	selectedNode: AppNode | null;
}) {
	return (
		<>
			<Background />
			<Controls />
			<MiniMap bgColor="grey" zoomable pannable />
			{selectedNode ? <MenubarBottomMiddle /> : null}
		</>
	);
}
