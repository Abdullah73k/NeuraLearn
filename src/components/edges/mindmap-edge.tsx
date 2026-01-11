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

	// Generate unique gradient and animation IDs for this edge
	const gradientId = `pulse-gradient-${id}`;
	const animationDelay = pathIndex * 0.15; // Stagger animation based on position in path

	return (
		<>
			{/* Define gradient for the pulse effect */}
			{isInActivePath && (
				<defs>
					<linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stopColor={COLORS[relation]} stopOpacity="0.3">
							<animate
								attributeName="offset"
								values="-1;1"
								dur="1.5s"
								repeatCount="indefinite"
								begin={`${animationDelay}s`}
							/>
						</stop>
						<stop offset="15%" stopColor={COLORS[relation]} stopOpacity="1">
							<animate
								attributeName="offset"
								values="-0.85;1.15"
								dur="1.5s"
								repeatCount="indefinite"
								begin={`${animationDelay}s`}
							/>
						</stop>
						<stop offset="30%" stopColor="#ffffff" stopOpacity="1">
							<animate
								attributeName="offset"
								values="-0.7;1.3"
								dur="1.5s"
								repeatCount="indefinite"
								begin={`${animationDelay}s`}
							/>
						</stop>
						<stop offset="45%" stopColor={COLORS[relation]} stopOpacity="1">
							<animate
								attributeName="offset"
								values="-0.55;1.45"
								dur="1.5s"
								repeatCount="indefinite"
								begin={`${animationDelay}s`}
							/>
						</stop>
						<stop offset="60%" stopColor={COLORS[relation]} stopOpacity="0.3">
							<animate
								attributeName="offset"
								values="-0.4;1.6"
								dur="1.5s"
								repeatCount="indefinite"
								begin={`${animationDelay}s`}
							/>
						</stop>
					</linearGradient>
				</defs>
			)}

			{/* Base edge - always visible */}
			<BaseEdge
				id={id}
				path={edgePath}
				style={{
					stroke: isInActivePath ? COLORS[relation] : "#d1d5db",
					strokeWidth: isInActivePath ? 3 : 2,
					transition: "stroke-width 0.3s ease, stroke 0.3s ease",
				}}
			/>

			{/* Animated pulse overlay - only when in active path */}
			{isInActivePath && (
				<>
					{/* Glow effect */}
					<path
						d={edgePath}
						fill="none"
						stroke={COLORS[relation]}
						strokeWidth="8"
						strokeOpacity="0.2"
						style={{
							filter: "blur(4px)",
						}}
					/>

					{/* Pulse traveling along the edge */}
					<circle r="6" fill={COLORS[relation]}>
						<animateMotion
							dur="1.5s"
							repeatCount="indefinite"
							begin={`${animationDelay}s`}
							path={edgePath}
						/>
						<animate
							attributeName="r"
							values="4;7;4"
							dur="0.5s"
							repeatCount="indefinite"
						/>
						<animate
							attributeName="opacity"
							values="0.8;1;0.8"
							dur="0.5s"
							repeatCount="indefinite"
						/>
					</circle>

					{/* Trailing particle effect */}
					<circle r="3" fill="#ffffff" opacity="0.8">
						<animateMotion
							dur="1.5s"
							repeatCount="indefinite"
							begin={`${animationDelay + 0.1}s`}
							path={edgePath}
						/>
					</circle>

					{/* Second trailing particle */}
					<circle r="2" fill={COLORS[relation]} opacity="0.6">
						<animateMotion
							dur="1.5s"
							repeatCount="indefinite"
							begin={`${animationDelay + 0.2}s`}
							path={edgePath}
						/>
					</circle>
				</>
			)}
		</>
	);
}
