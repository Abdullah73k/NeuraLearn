"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { SubtopicNode } from "@/types/nodes";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useMindMapActions, useGetSelectedNode } from "@/store/hooks";
import { ShineBorder } from "@/components/ui/shine-border";
import { NeonGradientBorder } from "@/components/ui/neon-gradient-border";
import { NodeInfoTerminal } from "./node-info-terminal";

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
 * Hover state: Shows NodeInfoTerminal with metadata on hover
 * 
 * Opacity: Non-selected nodes have reduced opacity when another node is selected
 *
 * Data contract: Uses data.title (preserved)
 */
export function SubtopicNode({ id, data, selected }: NodeProps<SubtopicNode>) {
	const { setSubTopicNodeTitle } = useMindMapActions();
	const selectedNode = useGetSelectedNode();
	const [isHovered, setIsHovered] = useState(false);
	const [showTerminal, setShowTerminal] = useState(false);
	const nodeRef = useRef<HTMLDivElement>(null!);

	// Check if this node is the parent or root of the selected node
	const isParentOfSelected = selectedNode?.data?.metadata?.parentId === id;
	const isRootOfSelected = selectedNode?.data?.metadata?.rootId === id;

	// Check if any node is selected but not this one (and this isn't parent/root of selected)
	const hasOtherNodeSelected = selectedNode !== null && !selected && !isParentOfSelected && !isRootOfSelected;

	// Debounced hover to prevent flickering
	useEffect(() => {
		let timeout: NodeJS.Timeout;
		if (isHovered) {
			timeout = setTimeout(() => setShowTerminal(true), 300);
		} else {
			setShowTerminal(false);
		}
		return () => clearTimeout(timeout);
	}, [isHovered]);

	const handleMouseEnter = useCallback(() => {
		setIsHovered(true);
	}, []);

	const handleMouseLeave = useCallback(() => {
		setIsHovered(false);
	}, []);

	return (
		<div
			ref={nodeRef}
			className={cn(
				"relative rounded-full bg-white p-4 w-[160px] h-[160px] flex items-center justify-center transition-all duration-200",
				selected
					? "ring-2 ring-purple-200"
					: "",
				hasOtherNodeSelected && "opacity-40"
			)}
			style={{ boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)" }}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			{/* Node Info Terminal - shows on hover for any node */}
			<NodeInfoTerminal
				isVisible={showTerminal}
				nodeTitle={data.title}
				nodeType="subtopic"
				metadata={data.metadata}
				position="left"
				nodeRef={nodeRef}
			/>
			{/* Neon gradient border effect - always visible */}
			<NeonGradientBorder
				borderWidth={2}
				neonColors={{ firstColor: "#a855f7", secondColor: "#ec4899" }}
				blurAmount={12}
			/>
			
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
