import { AppNode } from "@/types/nodes";
import { MindMapEdge } from "@/types/edges";

// Node dimensions for layout calculations
const NODE_DIMENSIONS = {
  root: { width: 280, height: 80 },
  subtopic: { width: 160, height: 160 },
  note: { width: 240, height: 180 },
};

// Layout configuration
const LAYOUT_CONFIG = {
  horizontalSpacing: 60, // Space between sibling nodes
  verticalSpacing: 120, // Space between parent and children levels
};

/**
 * Represents a tree node structure for layout calculation
 */
interface TreeNode {
  id: string;
  children: TreeNode[];
  width: number;
  height: number;
  x: number;
  y: number;
}

/**
 * Build a tree structure from nodes and edges
 */
function buildTree(nodes: AppNode[], edges: MindMapEdge[]): Map<string, TreeNode> {
  const nodeMap = new Map<string, TreeNode>();
  
  // Create tree nodes
  nodes.forEach((node) => {
    const dims = NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS] || NODE_DIMENSIONS.subtopic;
    nodeMap.set(node.id, {
      id: node.id,
      children: [],
      width: dims.width,
      height: dims.height,
      x: 0,
      y: 0,
    });
  });

  // Build parent-child relationships from edges
  edges.forEach((edge) => {
    const parent = nodeMap.get(edge.source);
    const child = nodeMap.get(edge.target);
    if (parent && child) {
      parent.children.push(child);
    }
  });

  return nodeMap;
}

/**
 * Find the root nodes (nodes with no incoming edges)
 */
function findRootNodes(nodes: AppNode[], edges: MindMapEdge[]): string[] {
  const hasIncoming = new Set(edges.map((e) => e.target));
  return nodes.filter((n) => !hasIncoming.has(n.id)).map((n) => n.id);
}

/**
 * Calculate the width of a subtree (for centering children under parents)
 */
function calculateSubtreeWidth(node: TreeNode): number {
  if (node.children.length === 0) {
    return node.width;
  }

  const childrenWidth = node.children.reduce((sum, child) => {
    return sum + calculateSubtreeWidth(child);
  }, 0);

  const gapsWidth = (node.children.length - 1) * LAYOUT_CONFIG.horizontalSpacing;
  const totalChildrenWidth = childrenWidth + gapsWidth;

  return Math.max(node.width, totalChildrenWidth);
}

/**
 * Position a subtree recursively
 */
function positionSubtree(node: TreeNode, x: number, y: number): void {
  // Center the node at the given position
  node.x = x - node.width / 2;
  node.y = y;

  if (node.children.length === 0) return;

  // Calculate total width needed for children
  const childrenWidths = node.children.map((child) => calculateSubtreeWidth(child));
  const totalChildrenWidth =
    childrenWidths.reduce((sum, w) => sum + w, 0) +
    (node.children.length - 1) * LAYOUT_CONFIG.horizontalSpacing;

  // Position children below the parent, centered under it
  let childX = x - totalChildrenWidth / 2;
  const childY = y + node.height + LAYOUT_CONFIG.verticalSpacing;

  node.children.forEach((child, index) => {
    const childWidth = childrenWidths[index];
    const childCenterX = childX + childWidth / 2;
    positionSubtree(child, childCenterX, childY);
    childX += childWidth + LAYOUT_CONFIG.horizontalSpacing;
  });
}

/**
 * Calculate tree layout for all nodes
 */
export function calculateTreeLayout(
  nodes: AppNode[],
  edges: MindMapEdge[]
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();

  if (nodes.length === 0) return positions;

  const nodeMap = buildTree(nodes, edges);
  const rootIds = findRootNodes(nodes, edges);

  // Position each tree starting from its root
  let currentX = 0;

  rootIds.forEach((rootId) => {
    const rootNode = nodeMap.get(rootId);
    if (!rootNode) return;

    const treeWidth = calculateSubtreeWidth(rootNode);
    const centerX = currentX + treeWidth / 2;

    positionSubtree(rootNode, centerX, 0);

    currentX += treeWidth + LAYOUT_CONFIG.horizontalSpacing * 2;
  });

  // Extract positions from tree nodes
  nodeMap.forEach((treeNode, id) => {
    positions.set(id, { x: treeNode.x, y: treeNode.y });
  });

  return positions;
}

/**
 * Calculate the position for a new child node
 * This is used when adding a single new node to an existing tree
 */
export function calculateNewChildPosition(
  parentNode: AppNode,
  existingNodes: AppNode[],
  existingEdges: MindMapEdge[]
): { x: number; y: number } {
  const parentDims = NODE_DIMENSIONS[parentNode.type as keyof typeof NODE_DIMENSIONS] || NODE_DIMENSIONS.subtopic;
  const childDims = NODE_DIMENSIONS.subtopic; // New nodes are usually subtopics

  // Find existing siblings (children of the same parent)
  const siblingIds = existingEdges
    .filter((e) => e.source === parentNode.id)
    .map((e) => e.target);

  const siblings = existingNodes.filter((n) => siblingIds.includes(n.id));

  // Calculate Y position: below the parent
  const childY = parentNode.position.y + parentDims.height + LAYOUT_CONFIG.verticalSpacing;

  // Calculate X position based on existing siblings
  if (siblings.length === 0) {
    // First child: center under parent
    const parentCenterX = parentNode.position.x + parentDims.width / 2;
    return {
      x: parentCenterX - childDims.width / 2,
      y: childY,
    };
  }

  // Find the rightmost sibling
  const rightmostSibling = siblings.reduce((rightmost, current) => {
    const currentRight = current.position.x + (NODE_DIMENSIONS[current.type as keyof typeof NODE_DIMENSIONS]?.width || childDims.width);
    const rightmostRight = rightmost.position.x + (NODE_DIMENSIONS[rightmost.type as keyof typeof NODE_DIMENSIONS]?.width || childDims.width);
    return currentRight > rightmostRight ? current : rightmost;
  });

  const rightmostDims = NODE_DIMENSIONS[rightmostSibling.type as keyof typeof NODE_DIMENSIONS] || childDims;

  // Position to the right of the rightmost sibling
  return {
    x: rightmostSibling.position.x + rightmostDims.width + LAYOUT_CONFIG.horizontalSpacing,
    y: childY,
  };
}

/**
 * Re-layout all nodes to center children under their parents
 * Call this after adding/removing nodes to rebalance the tree
 */
export function rebalanceTreeLayout(
  nodes: AppNode[],
  edges: MindMapEdge[]
): AppNode[] {
  const positions = calculateTreeLayout(nodes, edges);

  return nodes.map((node) => {
    const pos = positions.get(node.id);
    if (pos) {
      return {
        ...node,
        position: pos,
      };
    }
    return node;
  });
}

/**
 * Determine the best source handle for parent and target handle for child
 * For a tree layout, we connect bottom of parent to top of child
 */
export function getTreeEdgeHandles(
  sourceNode: AppNode,
  targetNode: AppNode
): { sourceHandle: string; targetHandle: string } {
  const sourceType = sourceNode.type;
  const targetType = targetNode.type;

  // For tree layout: connect bottom of parent to top of child
  let sourceHandle: string;
  let targetHandle: string;

  // Determine source handle based on node type
  switch (sourceType) {
    case "root":
      sourceHandle = "root-bottom";
      break;
    case "subtopic":
      sourceHandle = "subtopic-bottom";
      break;
    case "note":
      sourceHandle = "note-bottom";
      break;
    default:
      sourceHandle = "subtopic-bottom";
  }

  // Determine target handle based on node type
  switch (targetType) {
    case "subtopic":
      targetHandle = "subtopic-top-target";
      break;
    case "note":
      targetHandle = "note-top-target";
      break;
    default:
      targetHandle = "subtopic-top-target";
  }

  return { sourceHandle, targetHandle };
}

/**
 * Fix edge handles to use proper tree layout connections (bottom -> top)
 * This updates existing edges to have correct sourceHandle and targetHandle
 */
export function fixEdgeHandles(
  edges: MindMapEdge[],
  nodes: AppNode[]
): MindMapEdge[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return edges.map((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode || !targetNode) {
      return edge;
    }

    const { sourceHandle, targetHandle } = getTreeEdgeHandles(sourceNode, targetNode);

    return {
      ...edge,
      sourceHandle,
      targetHandle,
    };
  });
}
