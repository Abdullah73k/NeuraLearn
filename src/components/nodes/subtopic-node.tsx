'use client';

import { useState } from "react";
import type { NodeProps } from "@xyflow/react";
import type { SubtopicNode } from "@/types/nodes";
import { Input } from "@/components/ui/input";

/**
 * Subtopic node branching from the root topic.
 * Styled as a circular badge that emphasizes selection with a darker border.
 */
export function SubtopicNodeComponent({
  data,
  selected,
}: NodeProps<SubtopicNode>) {
  const [title, setTitle] = useState(data.title);

  return (
    <div
      className={`flex h-32 w-32 items-center justify-center rounded-full p-2 text-center ${
        selected ? "border-2 border-green-500" : "border border-green-200"
      } bg-green-50`}
    >
      <Input
        value={title}
        onChange={(event) => {
          const nextTitle = event.target.value;
          setTitle(nextTitle);
          // Hook up to a flow-level updater later, e.g. data.onTitleChange?.(nextTitle);
        }}
        className="w-full bg-transparent text-center text-sm font-semibold text-green-900 border-none focus:outline-none focus:ring-0"
        aria-label="Subtopic title"
      />
    </div>
  );
}
