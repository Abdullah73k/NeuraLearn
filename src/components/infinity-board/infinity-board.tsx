"use client";

import { nodeTypes } from "@/lib/node-types-map";
import { useMindMapActions, useMindMapStore } from "@/store/store";
import { AppNode } from "@/types/nodes";
import {
	ReactFlow,
	useNodesState,
	useEdgesState,
	OnConnect,
	addEdge,
	ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import InfinityBoardConfig from "./infinity-board-config";

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
	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
	const { setSelectedNode } = useMindMapActions();
	const selectedNode = useMindMapStore((state) => state.selectedNode);

	const onConnect: OnConnect = (params) =>
		setEdges((edges) => addEdge(params, edges));

	return (
		<ReactFlowProvider>
			<div style={{ width: "100vw", height: "100vh" }}>
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
					fitView
				>
					<InfinityBoardConfig selectedNode={selectedNode} />
				</ReactFlow>
			</div>
		</ReactFlowProvider>
	);
}
