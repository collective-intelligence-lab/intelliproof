import dagre from 'dagre';
import type { Node, Edge } from 'reactflow';

export interface LayoutConfig {
  direction?: 'TB' | 'LR'; // TB = Top to Bottom, LR = Left to Right
  nodeWidth?: number;
  nodeHeight?: number;
  nodeSeparation?: number; // Horizontal separation between nodes
  rankSeparation?: number; // Vertical separation between ranks
}

/**
 * Beautifies a graph by applying hierarchical layout using dagre algorithm.
 * Properly positions nodes to create a clear visual hierarchy.
 * 
 * @param nodes - Array of React Flow nodes to be laid out
 * @param edges - Array of React Flow edges
 * @param config - Optional configuration for layout parameters
 * @returns Object with layouted nodes and original edges
 */
export const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  config: LayoutConfig = {}
) => {
  const {
    direction = 'TB',
    nodeWidth = 180,      // Adjusted for typical claim node width
    nodeHeight = 80,      // Adjusted for typical claim node height
    nodeSeparation = 60,  // Increased for better spacing
    rankSeparation = 120, // Increased for better vertical spacing
  } = config;

  // Early exit for empty graphs
  if (nodes.length === 0) {
    return { nodes, edges };
  }

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Configure graph layout with proper spacing
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: nodeSeparation,
    ranksep: rankSeparation,
    marginx: 50,
    marginy: 50,
  });

  // Feed the algorithm all our nodes with dimensions
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight,
    });
  });

  // Feed the algorithm all our edges
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate the layout (dagre does the heavy lifting)
  try {
    dagre.layout(dagreGraph);
  } catch (error) {
    console.warn('Dagre layout calculation failed, returning original positions', error);
    return { nodes, edges };
  }

  // Map the new coordinates back onto our React Flow nodes
  // Dagre returns the center of each node, so we offset by half the node dimensions
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    if (!nodeWithPosition) {
      console.warn(`Node ${node.id} not found in dagre graph, keeping original position`);
      return node;
    }

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};