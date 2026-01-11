"use client";

import { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { RootNode } from "@/types/nodes";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGetRootNodeTitle, useMindMapActions } from "@/store/hooks";
import { ShineBorder } from "@/components/ui/shine-border";

/**
 * Root Node Component
 *
 * Visual style: Similar to the "output" node but wider and slightly shorter:
 * - White background with subtle grey border
 * - Soft shadow and rounded corners
 * - Wider rectangle design for main topic emphasis
 * - Larger, bolder title text
 *
 * Selection state: When selected, displays a CYAN border (ring-2 ring-cyan-500)
 *
 * Data contract: Uses data.title (unchanged)
 */
export function RootNode({ data, selected }: NodeProps<RootNode>) {
	const { setRootNodeTitle } = useMindMapActions();
	return (
		<div
			className={cn(
				"relative rounded-2xl bg-white shadow-sm px-6 py-4 min-w-[280px] min-h-[80px] flex items-center justify-center transition-all"
			)}
		>
			{/* Animated shine border effect - only when selected */}
			{selected && (
				<ShineBorder
					borderWidth={2}
					duration={8}
					shineColor={["#06b6d4", "#3b82f6", "#8b5cf6", "#06b6d4"]}
				/>
			)}
			
			{/* Main title input - prominent and centered */}
			<Input
				value={data.title}
				onChange={(event) => {
					setRootNodeTitle(event);
				}}
				onKeyDown={(event) => {
					if (event.key === "Enter") {
						event.preventDefault();
						event.currentTarget.blur();
					}
				}}
				className="w-full bg-transparent px-0 text-center text-base font-semibold text-neutral-800 border-none focus:outline-none focus:ring-0 h-auto"
				placeholder="Root topic"
				aria-label="Root topic title"
			/>

			{/* React Flow Handles - positioned absolutely */}
			{/* Top handles */}
			<Handle type="source" position={Position.Top} id="root-top" />

			{/* Right handles */}
			<Handle type="source" position={Position.Right} id="root-right" />
			<Handle
				type="source"
				position={Position.Right}
				id="root-right-2"
				style={{ top: "70%" }}
			/>

			{/* Bottom handles */}
			<Handle type="source" position={Position.Bottom} id="root-bottom" />

			{/* Left handles */}
			<Handle type="source" position={Position.Left} id="root-left" />
			<Handle
				type="source"
				position={Position.Left}
				id="root-left-2"
				style={{ top: "70%" }}
			/>
		</div>
	);
}
