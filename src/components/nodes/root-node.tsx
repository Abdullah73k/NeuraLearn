'use client';

import { useState } from "react";
import type { NodeProps } from "@xyflow/react";
import type { RootNode } from "@/types/nodes";
import { Input } from "@/components/ui/input";

/**
 * Root node representing the main topic of the mind-map.
 * Renders a soft, cloud-like pill that highlights when selected.
 */
export function RootNodeComponent({ data, selected }: NodeProps<RootNode>) {
  const [title, setTitle] = useState(data.title);

  return (
    <div
      className={`relative inline-flex min-w-[220px] items-center justify-center px-6 py-3 text-center shadow-sm ${
        selected ? "border-2 border-gray-500" : "border border-gray-300"
      } bg-[#fff7e6] rounded-full`}
    >
      {/* Optional extra circles to push the cloud vibe without affecting content */}
      <span className="pointer-events-none absolute -left-4 top-2 h-6 w-6 rounded-full bg-[#fff7e6]/70" />
      <span className="pointer-events-none absolute -right-3 bottom-1 h-5 w-5 rounded-full bg-[#fff7e6]/70" />

      <Input
        value={title}
        onChange={(event) => {
          const nextTitle = event.target.value;
          setTitle(nextTitle);
          // Later we can sync with React Flow by calling a callback like:
          // data.onTitleChange?.(nextTitle);
        }}
        className="w-full bg-transparent px-0 text-center text-base font-semibold text-gray-800 border-none focus:outline-none focus:ring-0"
        aria-label="Root topic title"
      />
    </div>
  );
}
