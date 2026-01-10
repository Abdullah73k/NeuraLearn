import { Background, Controls, MiniMap } from "@xyflow/react";
import PanelBottomMiddle from "./panels/panel-bottom-middle";
import PanelTopLeft from "./panels/panel-top-left";
import { AppNode } from "@/types/nodes";
import PanelTopMiddle from "./panels/panel-top-middle";

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
			{selectedNode ? <PanelBottomMiddle /> : null}
			<PanelTopLeft />
			<PanelTopMiddle />
		</>
	);
}
