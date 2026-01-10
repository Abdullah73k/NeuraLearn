// NoteNodeComponent.tsx
import { TNoteNode } from "@/types/nodes";
import type { NodeProps } from "@xyflow/react";

export function NoteNode({ data, selected }: NodeProps<TNoteNode>) {
	return (
		<div
			style={{
				padding: 10,
				borderRadius: 8,
				border: selected ? "2px solid #f97316" : "1px solid #d4d4d4",
				background: "#fef3c7", // sticky note vibe
				minWidth: 180,
			}}
		>
			<div style={{ fontWeight: 700, marginBottom: 4 }}>{data.title}</div>
			<div style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>
				{data.description}
			</div>
		</div>
	);
}
