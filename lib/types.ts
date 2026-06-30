export type NodeType = 'spine' | 'branch'
export type Category = 'education' | 'career' | 'relationship' | 'location' | 'health' | 'identity' | 'financial' | 'creative' | 'external'
export type Valence = 'positive' | 'complex' | 'heavy' | 'neutral'
export type NodeSource = 'user_stated' | 'ai_inferred'
export type EdgeType = 'spine_sequence' | 'attribution' | 'causal'
export type EdgeSource = 'ai_suggested' | 'user_confirmed' | 'user_created'
export interface Entity { name: string; entity_id: string | null; type?: string | null; attributes?: Record<string, unknown> | null }
export interface GraphNode { node_id: string; type: NodeType; category: Category; date: string | null; entity: Entity | null; title: string; valence: Valence; confidence: number; source: NodeSource; raw_quote: string | null; parent_spine_id: string | null }
export interface GraphEdge { edge_id: string; source_node_id: string; target_node_id: string; edge_type: EdgeType; weight: number; direction: 'forward' | 'bidirectional'; confidence: number; source: EdgeSource; rationale: string | null }
export interface CausalGraph { nodes: GraphNode[]; edges: GraphEdge[] }
