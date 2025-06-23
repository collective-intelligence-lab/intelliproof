import type { MarkerType } from 'reactflow';

export type EdgeType = 'supporting' | 'attacking';

export interface ClaimEdge {
  id: string;
  source: string;
  target: string;
  type: 'custom';  // we'll create a custom edge type
  data: {
    edgeType: EdgeType;
  };
  markerEnd?: {
    type: MarkerType;
    color?: string;
  };
}

export const EDGE_COLORS = {
  supporting: '#166534', // darker green
  attacking: '#991B1B',  // darker red
} as const; 