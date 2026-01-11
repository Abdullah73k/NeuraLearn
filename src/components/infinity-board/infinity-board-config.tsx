import { Background, Controls, MiniMap } from "@xyflow/react";
import PanelTopLeft from "./panels/panel-top-left";
import { AppNode } from "@/types/nodes";
import PanelTopMiddle from "./panels/panel-top-middle";
import PanelBottomMiddle from "./panels/panel-bottom-middle";

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
			<PanelBottomMiddle />
			<PanelTopMiddle />
		</>
	);
}
