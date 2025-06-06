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
  supporting: '#22C55E', // green
  attacking: '#EF4444',  // red
} as const; 