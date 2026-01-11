"use client";

import { useCallback, useMemo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Terminal, AnimatedSpan } from "@/components/ui/terminal";
import type { NodeMetadata } from "@/types/nodes";
import { cn } from "@/lib/utils";

interface NodeInfoTerminalProps {
  /** Whether to show the terminal */
  isVisible: boolean;
  /** The node's title */
  nodeTitle: string;
  /** The node's type */
  nodeType: "root" | "subtopic" | "note";
  /** Node metadata to display */
  metadata?: NodeMetadata;
  /** Additional class names */
  className?: string;
  /** Position of the terminal relative to the node */
  position?: "top" | "bottom" | "left" | "right";
  /** Reference to the node element for positioning */
  nodeRef?: React.RefObject<HTMLDivElement>;
}

/**
 * A terminal-style info popup that appears when hovering over a node.
 * Displays node metadata including:
 * - Point of origin (how the node was created)
 * - Time of creation
 * - Quick summary
 * - Parent node
 * - Root node
 */
export function NodeInfoTerminal({
  isVisible,
  nodeTitle,
  nodeType,
  metadata,
  className,
  position = "top",
  nodeRef,
}: NodeInfoTerminalProps) {
  const [mounted, setMounted] = useState(false);
  const [terminalPosition, setTerminalPosition] = useState({ top: 0, left: 0 });

  // Handle client-side mounting for portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update position when visible and nodeRef changes
  useEffect(() => {
    if (isVisible && nodeRef?.current) {
      const rect = nodeRef.current.getBoundingClientRect();
      const terminalWidth = 280;
      const gap = 20; // Gap between node and terminal
      
      let top = 0;
      let left = 0;
      
      switch (position) {
        case "top":
          top = rect.top - gap; // Position above node with gap
          left = rect.left + rect.width / 2 - terminalWidth / 2;
          break;
        case "bottom":
          top = rect.bottom + gap;
          left = rect.left + rect.width / 2 - terminalWidth / 2;
          break;
        case "left":
          top = rect.top + rect.height / 2;
          left = rect.left - terminalWidth - gap;
          break;
        case "right":
          top = rect.top + rect.height / 2;
          left = rect.right + gap;
          break;
      }
      
      setTerminalPosition({ top, left });
    }
  }, [isVisible, nodeRef, position]);

  // Format the creation date
  const formatDate = useCallback((date?: Date | string) => {
    if (!date) return "Unknown";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // Get origin label
  const getOriginLabel = useCallback((origin?: string) => {
    switch (origin) {
      case "user":
        return "Created by user";
      case "ai-suggested":
        return "AI suggested";
      case "ai-generated":
        return "AI generated";
      case "imported":
        return "Imported";
      default:
        return "User created";
    }
  }, []);

  // Get position styles
  const positionStyles = useMemo(() => {
    switch (position) {
      case "top":
        return "bottom-full left-1/2 -translate-x-1/2 mb-3";
      case "bottom":
        return "top-full left-1/2 -translate-x-1/2 mt-3";
      case "left":
        return "right-full top-1/2 -translate-y-1/2 mr-3";
      case "right":
        return "left-full top-1/2 -translate-y-1/2 ml-3";
      default:
        return "bottom-full left-1/2 -translate-x-1/2 mb-3";
    }
  }, [position]);

  // Get node type color
  const getTypeColor = useCallback((type: string) => {
    switch (type) {
      case "root":
        return "text-cyan-600";
      case "subtopic":
        return "text-purple-600";
      case "note":
        return "text-amber-600";
      default:
        return "text-neutral-500";
    }
  }, []);

  // Truncate long text
  const truncateText = useCallback((text: string, maxLength: number) => {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  }, []);

  // Get first sentence of text (up to first period)
  const getFirstSentence = useCallback((text: string) => {
    if (!text) return "";
    const periodIndex = text.indexOf(".");
    if (periodIndex === -1) return text;
    return text.substring(0, periodIndex + 1);
  }, []);

  // Don't render on server or if not mounted
  if (!mounted) return null;

  const terminalContent = (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: position === "top" ? 10 : position === "bottom" ? -10 : 0 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: position === "top" ? 10 : position === "bottom" ? -10 : 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className={cn(
            "fixed pointer-events-none",
            className
          )}
          style={{ 
            zIndex: 99999,
            top: terminalPosition.top,
            left: terminalPosition.left,
            transform: position === "top" ? "translateY(-100%)" : position === "left" || position === "right" ? "translateY(-50%)" : undefined,
          }}
        >
          <Terminal
            className="w-[280px] h-auto bg-neutral-100/95 backdrop-blur-sm border-neutral-300 shadow-2xl text-[10px]"
            sequence={false}
          >
            {/* Header with node info */}
            <AnimatedSpan className="text-emerald-600 font-mono text-[10px]">
              <span className="text-neutral-400">$</span> node-info <span className={getTypeColor(nodeType)}>{nodeType}</span>
            </AnimatedSpan>

            {/* Node Title */}
            <AnimatedSpan className="mt-1 text-[10px]">
              <span className="text-neutral-400">title:</span>{" "}
              <span className="text-neutral-800 font-medium">
                {truncateText(nodeTitle || "Untitled", 30)}
              </span>
            </AnimatedSpan>

            {/* Point of Origin */}
            <AnimatedSpan className="text-[10px]">
              <span className="text-neutral-400">origin:</span>{" "}
              <span className="text-blue-600">
                {getOriginLabel(metadata?.origin)}
              </span>
            </AnimatedSpan>

            {/* Creation Time */}
            <AnimatedSpan className="text-[10px]">
              <span className="text-neutral-400">created:</span>{" "}
              <span className="text-green-600">
                {formatDate(metadata?.createdAt)}
              </span>
            </AnimatedSpan>

            {/* Summary - first sentence only */}
            {metadata?.summary && (
              <AnimatedSpan className="mt-0.5 text-[10px]">
                <span className="text-neutral-400">summary:</span>{" "}
                <span className="text-neutral-600">
                  {getFirstSentence(metadata.summary)}
                </span>
              </AnimatedSpan>
            )}

            {/* Parent Node */}
            {nodeType !== "root" && (
              <AnimatedSpan className="mt-0.5 text-[10px]">
                <span className="text-neutral-400">parent:</span>{" "}
                <span className="text-purple-600">
                  {truncateText(metadata?.parentTitle || metadata?.parentId || "None", 25)}
                </span>
              </AnimatedSpan>
            )}

            {/* Root Node */}
            {nodeType !== "root" && (
              <AnimatedSpan className="text-[10px]">
                <span className="text-neutral-400">root:</span>{" "}
                <span className="text-cyan-600">
                  {truncateText(metadata?.rootTitle || metadata?.rootId || "—", 25)}
                </span>
              </AnimatedSpan>
            )}

            {/* Tags */}
            {metadata?.tags && metadata.tags.length > 0 && (
              <AnimatedSpan className="mt-0.5 text-[10px]">
                <span className="text-neutral-400">tags:</span>{" "}
                <span className="text-amber-600">
                  {metadata.tags.slice(0, 3).join(", ")}
                  {metadata.tags.length > 3 && ` +${metadata.tags.length - 3}`}
                </span>
              </AnimatedSpan>
            )}
          </Terminal>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render using portal to escape stacking context
  return createPortal(terminalContent, document.body);
}
