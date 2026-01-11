import { type MindMapEdge } from "@/types/edges";
import {
	BaseEdge,
	EdgeProps,
	getBezierPath,
	useReactFlow,
} from "@xyflow/react";
import { useGetSelectedNode } from "@/store/hooks";
import { useMemo } from "react";

export const COLORS = {
	refines: "#3b82f6", // blue
	synthesizes: "#a855f7", // purple
	supports: "#22c55e", // green
	challenges: "#ef4444", // red
	background: "#64748b", // slate/muted
} as const;

/**
 * Find the path from root node to target node using BFS
 * Returns array of edge IDs in the path order (from root to target)
 */
function findPathToRoot(
	targetNodeId: string,
	edges: { id: string; source: string; target: string }[],
	nodes: { id: string; type?: string }[]
): string[] {
	// Find root node
	const rootNode = nodes.find((n) => n.type === "root");
	if (!rootNode) return [];

	// If target is root, no path needed
	if (targetNodeId === rootNode.id) return [];

	// BFS to find path from root to target
	const visited = new Set<string>();
	const queue: { nodeId: string; path: string[] }[] = [
		{ nodeId: rootNode.id, path: [] },
	];

	while (queue.length > 0) {
		const { nodeId, path } = queue.shift()!;

		if (nodeId === targetNodeId) {
			return path;
		}

		if (visited.has(nodeId)) continue;
		visited.add(nodeId);

		// Find all edges connected to this node (outgoing)
		for (const edge of edges) {
			if (edge.source === nodeId && !visited.has(edge.target)) {
				queue.push({
					nodeId: edge.target,
					path: [...path, edge.id],
				});
			}
		}
	}

	return [];
}

export default function MindMapEdge({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	data,
}: EdgeProps<MindMapEdge>) {
	const relation = data?.relationType ?? "background";
	const selectedNode = useGetSelectedNode();
	const { getEdges, getNodes } = useReactFlow();

	// Calculate path from root to selected node
	const pathEdgeIds = useMemo(() => {
		if (!selectedNode) return [];
		const edges = getEdges();
		const nodes = getNodes();
		return findPathToRoot(selectedNode.id, edges, nodes);
	}, [selectedNode, getEdges, getNodes]);

	// Check if this edge is in the active path
	const isInActivePath = pathEdgeIds.includes(id);
	const pathIndex = pathEdgeIds.indexOf(id);

	// Calculate the bezier path
	const [edgePath] = getBezierPath({
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
	});

	// Animation delay based on position in path (parent to child cascade)
	const animationDelay = pathIndex * 0.2;

	// Unique IDs for this edge's gradient
	const gradientId = `beam-gradient-${id}`;

	return (
		<>
			{/* Base edge - light gray when not active, colored when active */}
			<BaseEdge
				id={id}
				path={edgePath}
				style={{
					stroke: isInActivePath ? COLORS[relation] : "#d1d5db",
					strokeWidth: 2,
					strokeOpacity: isInActivePath ? 0.3 : 1,
				}}
			/>

			{/* Animated beam - only when in active path */}
			{isInActivePath && (
				<>
					<defs>
						<linearGradient
							id={gradientId}
							gradientUnits="userSpaceOnUse"
							x1={sourceX}
							y1={sourceY}
							x2={targetX}
							y2={targetY}
						>
							<stop offset="0%" stopColor={COLORS[relation]} stopOpacity="0">
								<animate
									attributeName="offset"
									values="-0.2;1"
									dur="0.8s"
									repeatCount="indefinite"
									begin={`${animationDelay}s`}
								/>
							</stop>
							<stop offset="10%" stopColor={COLORS[relation]} stopOpacity="1">
								<animate
									attributeName="offset"
									values="-0.1;1.1"
									dur="0.8s"
									repeatCount="indefinite"
									begin={`${animationDelay}s`}
								/>
							</stop>
							<stop offset="20%" stopColor={COLORS[relation]} stopOpacity="0">
								<animate
									attributeName="offset"
									values="0;1.2"
									dur="0.8s"
									repeatCount="indefinite"
									begin={`${animationDelay}s`}
								/>
							</stop>
						</linearGradient>
					</defs>

					{/* The animated beam path */}
					<path
						d={edgePath}
						fill="none"
						stroke={`url(#${gradientId})`}
						strokeWidth={3}
						strokeLinecap="round"
					/>
				</>
			)}
		</>
	);
}
