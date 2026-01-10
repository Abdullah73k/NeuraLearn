// SubtopicNodeComponent.tsx
import { TSubtopicNode } from "@/types/nodes";
import type { NodeProps } from "@xyflow/react";

export function SubtopicNode({ data, selected }: NodeProps<TSubtopicNode>) {
	return (
		<div
			style={{
				width: 140,
				height: 140,
				borderRadius: "50%", // circle
				border: selected ? "2px solid #22c55e" : "2px solid #9ca3af",
				background: "#f9fafb",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				padding: 8,
				textAlign: "center",
			}}
		>
			<span style={{ fontWeight: 600, fontSize: 14 }}>{data.title}</span>
		</div>
	);
}
