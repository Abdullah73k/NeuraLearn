import { type MindMapEdge } from "@/types/edges";
import { BezierEdge, EdgeProps } from "@xyflow/react";

export const COLORS = {
	refines: "#3b82f6", // blue
	synthesizes: "#a855f7", // purple
	supports: "#22c55e", // green
	challenges: "#ef4444", // red
	background: "#64748b", // slate/muted
} as const;

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

	return (
		<BezierEdge
			id={id}
			sourceX={sourceX}
			sourceY={sourceY}
			targetX={targetX}
			targetY={targetY}
			sourcePosition={sourcePosition}
			targetPosition={targetPosition}
			style={{
				stroke: COLORS[relation],
				strokeWidth: 2,
				strokeDasharray: relation === "background" ? "3 3" : "none",
			}}
			markerEnd="url(#arrow)"
		/>
	);
}
