import type { MarkerType } from 'reactflow';

export type EdgeType = 'supporting' | 'attacking';

export interface ClaimEdge {
  id: string;
  source: string;
  target: string;
  type: 'custom';  // we'll create a custom edge type
  data: {
    /**
     * Confidence level from -1 to 1. Negative = attack, positive = support.
     * The edge type is determined by the sign of confidence.
     */
    edgeType: EdgeType;
    confidence: number;
    edgeScore?: number;  // Score from edge validation
    /**
     * Natural-language explanation returned by edge validation.
     * Optional: present only after validation has been run.
     */
    reasoning?: string;
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