"use client";

import { nodeTypes } from "@/lib/node-types-map";
import { ReactFlow, ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import InfinityBoardConfig from "./infinity-board-config";
import {
	useGetActiveWorkspace,
	useGetCurrentRelationType,
	useGetSelectedNode,
	useIsChatBarOpen,
	useMindMapActions,
} from "@/store/hooks";
import { edgeTypes } from "@/lib/edge-types-map";
import { COLORS } from "../edges/mindmap-edge";

export default function InfinityBoard() {
	const {
		setSelectedNode,
		onConnectForActive,
		onNodesChangeForActive,
		onEdgesChangeForActive,
		setIsChatBarOpen,
		closeChatBar,
	} = useMindMapActions();
	const selectedNode = useGetSelectedNode();
	const isChatBarOpen = useIsChatBarOpen();
	const relationType = useGetCurrentRelationType();

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
					edgeTypes={edgeTypes}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					defaultEdgeOptions={{
						type: "mindmap", // use your custom edge component
						style: {
							stroke: COLORS[relationType], // preview matches selected relation!
							strokeWidth: 2,
							strokeDasharray: relationType === "background" ? "3 3" : "none",
						},
					}}
					// This gives u info of the node u click on
					onSelectionChange={({ nodes }) => {
						const selectedNode = nodes[0] ? nodes[0] : null;
						console.log("Selected Node: ", selectedNode);
						setSelectedNode(selectedNode);
						if (selectedNode && selectedNode.type === "subtopic") {
							setIsChatBarOpen();
						} else {
							closeChatBar();
						}
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
