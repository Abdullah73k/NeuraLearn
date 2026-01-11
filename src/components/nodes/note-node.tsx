"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { NoteNode } from "@/types/nodes";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useMindMapActions, useGetSelectedNode } from "@/store/hooks";
import { ShineBorder } from "@/components/ui/shine-border";
import { NeonGradientBorder } from "@/components/ui/neon-gradient-border";
import { NodeInfoTerminal } from "./node-info-terminal";

/**
 * Note Node Component
 *
 * Visual style: Matches the right-hand "output" node in the reference image exactly:
 * - Tall, rounded-rectangle shape
 * - White background with subtle grey border (border-neutral-200)
 * - Soft shadow (shadow-sm) and generous rounded corners (rounded-2xl)
 * - Header bar showing title, body area showing description
 *
 * Selection state: When selected, displays an ORANGE border (border-orange-500 + ring-2 ring-orange-200)
 *
 * Hover state: Shows NodeInfoTerminal with metadata on hover
 * 
 * Opacity: Non-selected nodes have reduced opacity when another node is selected
 *
 * Data contract: Uses data.title and data.description (both preserved and always displayed)
 */
export function NoteNode({ id, data, selected }: NodeProps<NoteNode>) {
	const [title, setTitle] = useState(data.title);
	const [description, setDescription] = useState(data.description);
	const { setNoteNodeTitle, setNoteNodeDescription } = useMindMapActions();
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
				"relative rounded-2xl bg-white px-4 py-3 min-w-[240px] min-h-[180px] flex flex-col transition-all duration-200",
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
				nodeType="note"
				metadata={data.metadata}
				position="left"
				nodeRef={nodeRef}
			/>
			{/* Neon gradient border effect - always visible */}
			<NeonGradientBorder
				borderWidth={2}
				neonColors={{ firstColor: "#f97316", secondColor: "#eab308" }}
				blurAmount={12}
			/>
			
			{/* Animated shine border effect - only when selected */}
			{selected && (
				<ShineBorder
					borderWidth={2}
					duration={12}
					shineColor={["#f97316", "#eab308", "#84cc16", "#f97316"]}
				/>
			)}
			
			{/* Header area with title - similar to "output" label in reference */}
			<div className="mb-2 pb-2 border-b border-neutral-100">
				<Input
					value={data.title}
					onChange={(event) => {
						setNoteNodeTitle(event, id);
					}}
					className="w-full bg-transparent text-sm font-medium text-neutral-800 border-none focus:outline-none focus:ring-0 px-0 h-auto"
					placeholder="Note title"
					aria-label="Note title"
				/>
			</div>

			{/* Body area with description - auto-sizes to content */}
			<div className="flex-1">
				<p className="text-xs text-neutral-600 leading-relaxed whitespace-pre-wrap">
					{data.description || "Add description..."}
				</p>
			</div>

			{/* React Flow Handles - positioned absolutely */}
			<Handle type="source" position={Position.Right} id="note-right" />
			<Handle type="source" position={Position.Top} id="note-top" />
			<Handle type="source" position={Position.Bottom} id="note-bottom" />
			<Handle type="source" position={Position.Left} id="note-left" />
			<Handle type="target" position={Position.Right} id="note-right-target" />
			<Handle type="target" position={Position.Top} id="note-top-target" />
			<Handle
				type="target"
				position={Position.Bottom}
				id="note-bottom-target"
			/>
			<Handle type="target" position={Position.Left} id="note-left-target" />
		</div>
	);
}
