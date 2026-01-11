"use client";

import { useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { NoteNode } from "@/types/nodes";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useMindMapActions } from "@/store/hooks";
import { ShineBorder } from "@/components/ui/shine-border";

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
 * Data contract: Uses data.title and data.description (both preserved and always displayed)
 */
export function NoteNode({ id, data, selected }: NodeProps<NoteNode>) {
	const [title, setTitle] = useState(data.title);
	const [description, setDescription] = useState(data.description);
	const { setNoteNodeTitle, setNoteNodeDescription } = useMindMapActions();
	return (
		<div
			className={cn(
				"relative rounded-2xl bg-white shadow-sm px-4 py-3 min-w-[240px] min-h-[180px] flex flex-col transition-all"
			)}
		>
			{/* Animated shine border effect - only when selected */}
			{selected && (
				<ShineBorder
					borderWidth={2}
					duration={12}
					shineColor={["#f97316", "#eab308", "#84cc16", "#f97316"]}
				/>
			)}
			
			{/* Header area with title - similar to "output" label in reference */}
			<div className="mb-3 pb-2 border-b border-neutral-100">
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

			{/* Body area with description - always visible */}
			<div className="flex-1">
				<Textarea
					value={data.description}
					onChange={(event) => {
						setNoteNodeDescription(event, id);
					}}
					className="min-h-[100px] w-full resize-none bg-transparent text-xs text-neutral-600 border-none focus:outline-none focus:ring-0 px-0 leading-relaxed"
					placeholder="Add description..."
					aria-label="Note description"
				/>
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
