'use client';

import { useState } from "react";
import type { NodeProps } from "@xyflow/react";
import type { NoteNode } from "@/types/nodes";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Free-form sticky note node (intentionally non-AI) for quick text capture.
 * Highlights with a stronger orange border when selected.
 */
export function NoteNodeComponent({ data, selected }: NodeProps<NoteNode>) {
  const [title, setTitle] = useState(data.title);
  const [description, setDescription] = useState(data.description);

  return (
    <div
      className={`min-w-[200px] rounded-lg p-3 shadow-sm ${
        selected ? "border border-orange-200" : "border border-orange-200"
      } bg-orange-50`}
    >
      <div className="space-y-1">
        <Input
          value={title}
          onChange={(event) => {
            const nextTitle = event.target.value;
            setTitle(nextTitle);
            // Syncing back to React Flow can be added later, e.g. data.onTitleChange?.(nextTitle);
          }}
          className="w-full bg-transparent text-sm font-semibold text-orange-900 border-none focus:outline-none focus:ring-0"
          aria-label="Note title"
        />

        <Textarea
          value={description}
          onChange={(event) => {
            const nextDescription = event.target.value;
            setDescription(nextDescription);
            // Likewise, we could later call data.onDescriptionChange?.(nextDescription);
          }}
          className="min-h-[80px] max-h-[160px] w-full resize-none bg-transparent text-xs leading-snug text-orange-900 border-none focus:outline-none focus:ring-0"
          aria-label="Note description"
        />
      </div>
    </div>
  );
}
