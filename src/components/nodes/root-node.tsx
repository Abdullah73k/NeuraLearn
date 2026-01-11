"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { RootNode } from "@/types/nodes";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGetRootNodeTitle, useMindMapActions, useGetSelectedNode } from "@/store/hooks";
import { ShineBorder } from "@/components/ui/shine-border";
import { NeonGradientBorder } from "@/components/ui/neon-gradient-border";
import { NodeInfoTerminal } from "./node-info-terminal";

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
 * Hover state: Shows NodeInfoTerminal with metadata on hover
 * 
 * Opacity: Non-selected nodes have reduced opacity when another node is selected
 *
 * Data contract: Uses data.title (unchanged)
 */
export function RootNode({ id, data, selected }: NodeProps<RootNode>) {
	const { setRootNodeTitle } = useMindMapActions();
	const selectedNode = useGetSelectedNode();
	const [isHovered, setIsHovered] = useState(false);
	const [showTerminal, setShowTerminal] = useState(false);
	const nodeRef = useRef<HTMLDivElement>(null);

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
				"relative rounded-2xl bg-white px-6 py-4 min-w-[280px] min-h-[80px] flex items-center justify-center transition-all duration-200",
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
				nodeType="root"
				metadata={data.metadata}
				position="left"
				nodeRef={nodeRef}
			/>
			{/* Neon gradient border effect - always visible */}
			<NeonGradientBorder
				borderWidth={2}
				neonColors={{ firstColor: "#06b6d4", secondColor: "#8b5cf6" }}
				blurAmount={12}
			/>
			
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
