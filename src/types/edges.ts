import type { MarkerType } from 'reactflow';

export type EdgeType = 'supporting' | 'attacking';
export type RelationshipConfidence = 'Very Low' | 'Low' | 'Medium' | 'High' | 'Very High';

export const RELATIONSHIP_CONFIDENCE_OPTIONS: RelationshipConfidence[] = [
  'Very Low',
  'Low',
  'Medium',
  'High',
  'Very High',
];

export const DEFAULT_RELATIONSHIP_CONFIDENCE: RelationshipConfidence = 'Medium';

export const isRelationshipConfidence = (
  value: unknown
): value is RelationshipConfidence =>
  typeof value === 'string' &&
  RELATIONSHIP_CONFIDENCE_OPTIONS.includes(value as RelationshipConfidence);

export interface ClaimEdge {
  id: string;
  source: string;
  target: string;
  type: 'custom';  // we'll create a custom edge type
  data: {
    edgeType: EdgeType;
    confidence: number;
    relationshipConfidence?: RelationshipConfidence;
    edgeScore?: number;  // Score from edge validation
    reasoning?: string;
    recommendedEdgeType?: EdgeType;

  };
  markerStart?: {
    type: MarkerType;
    color?: string;
  };
}

export const EDGE_COLORS = {
  supporting: '#166534', // darker green
  attacking: '#991B1B',  // darker red
} as const; 