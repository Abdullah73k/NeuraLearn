import { Node } from "@xyflow/react";

// nodeDataTypes.ts
export type RootNodeData = {
  title: string;
};

export type SubtopicNodeData = {
  title: string;
};

export type NoteNodeData = {
  title: string;
  description: string;
};

// One type per node kind
export type TRootNode = Node<RootNodeData, "root">;
export type TSubtopicNode = Node<SubtopicNodeData, "subtopic">;
export type TNoteNode = Node<NoteNodeData, "note">;

// A union of all nodes in your app
export type AppNode = TRootNode | TSubtopicNode | TNoteNode;
