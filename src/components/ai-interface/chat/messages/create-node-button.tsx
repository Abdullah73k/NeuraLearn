"use client";

import { MessageAction } from "@/components/ai-elements/message";
import { Loader2Icon, PlusCircleIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  useGetSelectedNode,
  useGetCurrentRelationType,
  useMindMapActions,
} from "@/store/hooks";
import { RelationType } from "@/types/edges";

type CreateNodeButtonProps = {
  text: string;
  messageId: string;
};

export default function CreateNodeButton({ text, messageId }: CreateNodeButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedText, setSelectedText] = useState<string>("");
  const [isEnabled, setIsEnabled] = useState(false);
  
  const selectedNode = useGetSelectedNode();
  const currentRelationType = useGetCurrentRelationType();
  const { setSelectedNode } = useMindMapActions();

  // Track text selection within this message
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const selectionText = selection?.toString().trim() || "";
      
      if (selectionText && text.includes(selectionText)) {
        // Verify the selection is within this specific message's text
        setSelectedText(selectionText);
        setIsEnabled(true);
      } else {
        setSelectedText("");
        setIsEnabled(false);
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [text]);

  const handleCreateNode = useCallback(async () => {
    if (!isEnabled || !selectedText || !selectedNode) return;

    try {
      setIsLoading(true);

      // Step 1: Generate node title from selected text
      const titleResponse = await fetch("/api/generate-node-title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedText,
          fullResponse: text,
        }),
      });

      if (!titleResponse.ok) {
        throw new Error("Failed to generate node title");
      }

      const { title } = await titleResponse.json();

      // Step 2: Create the new node
      const { useMindMapStore } = await import("@/store/store");
      const state = useMindMapStore.getState();
      
      if (!state.activeWorkspaceId) {
        throw new Error("No active workspace");
      }
      
      const workspace = state.workspaces.find(
        (w) => w.id === state.activeWorkspaceId
      );
      
      if (!workspace) {
        throw new Error("Workspace not found");
      }

      const newNodeId = crypto.randomUUID();
      
      // Position the new node relative to the source node
      const sourceNode = workspace.nodes.find((n) => n.id === selectedNode.id);
      const newPosition = sourceNode
        ? { x: sourceNode.position.x + 250, y: sourceNode.position.y + 150 }
        : { x: 250, y: 250 };

      const newNode = {
        id: newNodeId,
        type: "subtopic" as const,
        position: newPosition,
        data: { title },
      };

      const newEdge = {
        id: crypto.randomUUID(),
        source: selectedNode.id,
        target: newNodeId,
        type: "mindmap",
        data: { relationType: currentRelationType as RelationType },
      };

      // Update the store
      useMindMapStore.setState({
        workspaces: state.workspaces.map((w) =>
          w.id === state.activeWorkspaceId
            ? {
                ...w,
                nodes: [...w.nodes, newNode],
                edges: [...w.edges, newEdge],
              }
            : w
        ),
      });

      // Auto-select the new node
      setSelectedNode(newNode);

      // Clear selection
      window.getSelection()?.removeAllRanges();
      setSelectedText("");
      setIsEnabled(false);
    } catch (error) {
      console.error("Create node error:", error);
      alert("Failed to create node. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [isEnabled, selectedText, selectedNode, currentRelationType, text, setSelectedNode]);

  if (isLoading) {
    return (
      <MessageAction disabled label="Creating...">
        <Loader2Icon className="size-3 animate-spin" />
      </MessageAction>
    );
  }

  return (
    <MessageAction
      onClick={handleCreateNode}
      disabled={!isEnabled}
      label={isEnabled ? "Create Node" : "Select text first"}
      className={isEnabled ? "" : "opacity-50 cursor-not-allowed"}
    >
      <PlusCircleIcon className="size-3" />
    </MessageAction>
  );
}
