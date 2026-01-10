// RootNodeComponent.tsx
import { TRootNode } from "@/types/nodes";
import type { NodeProps } from "@xyflow/react";

export function RootNode({ data, selected }: NodeProps<TRootNode>) {
	return (
		<div
			style={{
				padding: 16,
				borderRadius: 999, // cloud-ish
				border: selected ? "2px solid #3b82f6" : "2px solid #6b7280",
				background: "#e0f2fe",
				minWidth: 220,
				textAlign: "center",
				boxShadow: "0 4px 8px rgba(0,0,0,0.08)",
			}}
		>
			<div style={{ fontWeight: 700, fontSize: 16 }}>{data.title}</div>
		</div>
	);
}
