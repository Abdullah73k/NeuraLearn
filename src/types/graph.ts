// Graph Node Types
export interface NodeNote {
  id: string;
  content: string;
  created_at: Date;
}

export interface Node {
  _id?: string;
  id: string;
  title: string;
  summary: string;
  parent_id: string | null;
  root_id: string;
  tags: string[];

  // User notes (personal annotations, not used by AI)
  notes?: NodeNote[];

  // Vector embedding for semantic search (768 dimensions from text-embedding-004)
  embedding?: number[];

  // Metadata
  interaction_count: number;
  last_refined_at: Date;
  created_at: Date;

  // Relations
  children_ids: string[];
  ancestor_path: string[]; // [root_id, ..., parent_id, this_id]

  // UI position (for ReactFlow canvas persistence)
  position?: { x: number; y: number };
}

export interface NodeInteraction {
  _id?: string;
  node_id: string;
  user_message: string;
  ai_response: string;
  timestamp: Date;
}

export interface RootTopic {
  _id?: string;
  id: string;
  title: string;
  description: string;
  node_count: number;
  created_at: Date;
}

// UI State Types
export interface UIState {
  rootNode: { id: string; title: string };
  activeNode: { id: string; title: string } | null;
}

export interface GraphSnapshot {
  rootChildren: Array<{ id: string; title: string; summary: string }>;
  activeAncestors?: Array<{ id: string; title: string; summary: string }>;
  activeChildren?: Array<{ id: string; title: string; summary: string }>;
}

// Search Types
export interface SearchResult {
  id: string;
  title: string;
  summary: string;
  parent_id: string | null;
  score: number;
  tags: string[];
}

// Chat Types
export interface ChatRequest {
  userMessage: string;
  rootNodeId: string;
  activeNodeId: string | null;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface ChatResponse {
  action: "activate" | "create" | "none";
  targetNodeId: string;
  activationPath: string[];
  response: string;
  newNode?: {
    id?: string;
    title: string;
    summary: string;
    parent_id: string;
    tags?: string[];
  };
  sources?: Array<{ url: string; title: string }>;
  summaryUpdated?: boolean;
}

// API Response Types
export interface CreateTopicResponse {
  success: boolean;
  topic: {
    id: string;
    title: string;
    description: string;
  };
}

export interface ApiError {
  error: string;
  details?: string;
}
