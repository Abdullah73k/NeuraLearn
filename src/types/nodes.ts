import type { Node } from "@xyflow/react";

/**
 * Metadata for node info terminal display (shown on hover)
 */
export type NodeMetadata = {
  /** When the node was created */
  createdAt?: Date | string;
  /** Summary of the node content */
  summary?: string;
  /** Parent node ID */
  parentId?: string | null;
  /** Parent node title (for display) */
  parentTitle?: string;
  /** Root node ID */
  rootId?: string;
  /** Root node title (for display) */
  rootTitle?: string;
  /** Point of origin (how the node was created) */
  origin?: "user" | "ai-suggested" | "ai-generated" | "imported";
  /** Tags associated with the node */
  tags?: string[];
};

/**
 * Data payload for the root node shown at the center of the graph.
 * React Flow passes this into the custom component via `data`.
 */
export type RootNodeData = {
  title: string;
  /** Node metadata for info terminal */
  metadata?: NodeMetadata;
};

/**
 * Data payload for a subtopic node branching from the root.
 * Used to populate the editable input inside the node component.
 */
export type SubtopicNodeData = {
  title: string;
  /** Node metadata for info terminal */
  metadata?: NodeMetadata;
};

/**
 * Data payload for a free-form note node that includes a short description.
 * Both fields can later be synced back to React Flow state.
 */
export type NoteNodeData = {
  title: string;
  description: string;
  /** Node metadata for info terminal */
  metadata?: NodeMetadata;
};

/**
 * Root node instance typed for React Flow's node registry.
 */
export type RootNode = Node<RootNodeData, "root">;

/**
 * Subtopic node instance typed for React Flow's node registry.
 */
export type SubtopicNode = Node<SubtopicNodeData, "subtopic">;

/**
 * Note node instance typed for React Flow's node registry.
 */
export type NoteNode = Node<NoteNodeData, "note">;

/**
 * Union representing any node our app can render.
 */
export type AppNode = RootNode | SubtopicNode | NoteNode;
