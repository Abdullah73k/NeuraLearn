import { Edge } from "@xyflow/react";

export const relations = [
	"refines",
	"synthesizes",
	"supports",
	"challenges",
	"background",
] as const;

export type RelationType = (typeof relations)[number];

export type MindMapEdge = Edge & {
	data: {
		relationType: RelationType;
	};
};
