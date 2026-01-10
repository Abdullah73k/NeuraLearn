"use client";

import { nodeTypes } from "@/lib/node-types-map";
import { AppNode } from "@/types/nodes";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import InfinityBoardConfig from "./infinity-board-config";
import {
	useGetSelectedNode,
	useIsChatBarOpen,
	useMindMapActions,
} from "@/store/hooks";

const initialNodes: AppNode[] = [
	{
		id: "root-1",
		type: "root",
		position: { x: 0, y: 0 },
		data: { title: "Main Topic of This Mindspace" },
	},
	{
		id: "sub-1",
		type: "subtopic",
		position: { x: 300, y: 0 },
		data: { title: "First Subtopic" },
	},
	{
		id: "note-1",
		type: "note",
		position: { x: 300, y: 200 },
		data: { title: "Random Note", description: "This is just a free note." },
	},
];

const initialEdges = [
	{
		id: "root-1-sub-1",
		source: "root-1",
		target: "sub-1",
	},
];

export default function InfinityBoard() {
	const {
		setSelectedNode,
		onConnectForActive,
		onNodesChangeForActive,
		onEdgesChangeForActive,
		getActiveWorkspace,
	} = useMindMapActions();
	const selectedNode = useGetSelectedNode();
	const isChatBarOpen = useIsChatBarOpen();

	const activeWorkspace = getActiveWorkspace();
	const nodes = activeWorkspace?.nodes || [];
	const edges = activeWorkspace?.edges || [];
	const onNodesChange = onNodesChangeForActive;
	const onEdgesChange = onEdgesChangeForActive;
	const onConnect = onConnectForActive;

	return (
		<ReactFlowProvider>
			<div
				className="m-auto"
				style={{
					width: `${isChatBarOpen ? "50dvw" : "80dvw"}`,
					height: "100dvh",
				}}
			>
				<ReactFlow
					nodes={nodes}
					edges={edges}
					nodeTypes={nodeTypes}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					// This gives u info of the node u click on
					onSelectionChange={({ nodes }) => {
						const selectedNode = nodes[0] ? nodes[0] : null;
						setSelectedNode(selectedNode);
					}}
					fitViewOptions={{ padding: 0.2 }}
					fitView
				>
					<InfinityBoardConfig selectedNode={selectedNode} />
				</ReactFlow>
			</div>
		</ReactFlowProvider>
	);
}
