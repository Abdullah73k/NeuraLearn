"use client";

import { nodeTypes } from "@/lib/node-types-map";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import InfinityBoardConfig from "./infinity-board-config";
import {
	useGetActiveWorkspace,
	useGetSelectedNode,
	useIsChatBarOpen,
	useMindMapActions,
} from "@/store/hooks";

export default function InfinityBoard() {
	const {
		setSelectedNode,
		onConnectForActive,
		onNodesChangeForActive,
		onEdgesChangeForActive,
	} = useMindMapActions();
	const selectedNode = useGetSelectedNode();
	const isChatBarOpen = useIsChatBarOpen();

	const activeWorkspace = useGetActiveWorkspace();
	const nodes = activeWorkspace?.nodes || [];
	const edges = activeWorkspace?.edges || [];
	const onNodesChange = onNodesChangeForActive;
	const onEdgesChange = onEdgesChangeForActive;
	const onConnect = onConnectForActive;

	if (!activeWorkspace) {
		return (
			<div className="flex justify-center items-center">
				<p className="text-mono text-pretty text-purple-500 text-lg">
					Select or create a workspace to get started!
				</p>
			</div>
		);
	}

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
