"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { SubtopicNode } from "@/types/nodes";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useMindMapActions } from "@/store/hooks";
import { ShineBorder } from "@/components/ui/shine-border";

/**
 * Subtopic Node Component
 *
 * Visual style: Matches the general card style but more squarish/short:
 * - White background with subtle grey border (border-neutral-200)
 * - Soft shadow (shadow-sm) and generous rounded corners (rounded-3xl for pill-like effect)
 * - More square-shaped, not a wide rectangle
 * - Title displayed clearly in center
 *
 * Selection state: When selected, displays a PURPLE border (border-purple-500 + ring-2 ring-purple-200)
 *
 * Data contract: Uses data.title (preserved)
 */
export function SubtopicNode({ id, data, selected }: NodeProps<SubtopicNode>) {
	const { setSubTopicNodeTitle } = useMindMapActions();
	return (
		<div
			className={cn(
				"relative rounded-full bg-white shadow-sm p-4 w-[160px] h-[160px] flex items-center justify-center transition-all",
				selected
					? "ring-2 ring-purple-200"
					: ""
			)}
		>
			{/* Animated shine border effect - only when selected */}
			{selected && (
				<ShineBorder
					borderWidth={2}
					duration={10}
					shineColor={["#a855f7", "#ec4899", "#f97316", "#a855f7"]}
				/>
			)}
			
			{/* Title input - centered */}
			<Input
				value={data.title}
				onChange={(event) => {
					setSubTopicNodeTitle(event, id);
				}}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						event.currentTarget.blur();
					}
				}}
				className="w-full bg-transparent text-center text-sm font-medium text-neutral-800 border-none focus:outline-none focus:ring-0 px-0 h-auto"
				placeholder="Subtopic"
				aria-label="Subtopic title"
			/>

			{/* React Flow Handles - positioned absolutely */}
			<Handle type="source" position={Position.Right} id="subtopic-right" />
			<Handle type="source" position={Position.Top} id="subtopic-top" />
			<Handle type="source" position={Position.Bottom} id="subtopic-bottom" />
			<Handle type="source" position={Position.Left} id="subtopic-left" />

			<Handle
				type="target"
				position={Position.Right}
				id="subtopic-right-target"
			/>
			<Handle type="target" position={Position.Top} id="subtopic-top-target" />
			<Handle
				type="target"
				position={Position.Bottom}
				id="subtopic-bottom-target"
			/>
			<Handle
				type="target"
				position={Position.Left}
				id="subtopic-left-target"
			/>
		</div>
	);
}
