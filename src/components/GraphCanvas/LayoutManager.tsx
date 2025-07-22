import { useCallback } from 'react';
import dagre from 'dagre';
import type { ClaimNode } from '../../types/graph';
import type { ClaimEdge } from '../../types/edges';
import { Bars3Icon } from "@heroicons/react/24/outline";

export interface LayoutManagerProps {
    nodes: ClaimNode[];
    edges: ClaimEdge[];
    setNodes: (nodes: ClaimNode[]) => void;
}

export const useLayoutManager = ({ nodes, edges, setNodes }: LayoutManagerProps) => {
    // CIRCULAR LAYOUT FUNCTION
    const applyCircularLayout = useCallback(() => {
        if (nodes.length === 0) return;

        const radius = 250;
        const centerX = 500;
        const centerY = 300;
        const angleStep = (2 * Math.PI) / nodes.length;

        const newNodes = nodes.map((node, i) => {
            const position = {
                x: centerX + radius * Math.cos(i * angleStep),
                y: centerY + radius * Math.sin(i * angleStep),
            };
            return {
                ...node,
                position,
                data: {
                    ...node.data,
                    position
                }
            };
        });
        setNodes(newNodes);
    }, [nodes, setNodes]);

    // DAGRE LAYOUT FUNCTION (Auto Layout)
    const applyAutoLayout = useCallback(() => {
        if (nodes.length === 0) return;

        const g = new dagre.graphlib.Graph();
        g.setDefaultEdgeLabel(() => ({}));
        g.setGraph({ rankdir: 'LR', nodesep: 100, ranksep: 100 });

        nodes.forEach((node) => {
            g.setNode(node.id, { width: 200, height: 100 });
        });

        edges.forEach((edge) => {
            g.setEdge(edge.source, edge.target);
        });

        dagre.layout(g);

        const newNodes = nodes.map((node) => {
            const dagreNode = g.node(node.id);
            const position = dagreNode ? { x: dagreNode.x - 100, y: dagreNode.y - 50 } : node.position;
            return {
                ...node,
                position,
                data: {
                    ...node.data,
                    position
                }
            };
        });
        setNodes(newNodes);
    }, [nodes, edges, setNodes]);

    // FORCE-DIRECTED LAYOUT FUNCTION (simple, not physics-accurate)
    const applyForceLayout = useCallback(() => {
        if (nodes.length === 0) return;

        const width = 800;
        const height = 400;
        const centerX = width / 2;
        const centerY = height / 2;
        const k = 200; // repulsion constant
        const iterations = 100;

        const nodePositions = nodes.map(n => ({
            ...n,
            fx: Math.random() * width,
            fy: Math.random() * height
        }));

        for (let iter = 0; iter < iterations; iter++) {
            // Repulsion
            for (let i = 0; i < nodePositions.length; i++) {
                for (let j = 0; j < nodePositions.length; j++) {
                    if (i === j) continue;
                    const dx = nodePositions[i].fx - nodePositions[j].fx;
                    const dy = nodePositions[i].fy - nodePositions[j].fy;
                    const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
                    const repulse = k * k / dist;
                    nodePositions[i].fx += (dx / dist) * repulse * 0.0001;
                    nodePositions[i].fy += (dy / dist) * repulse * 0.0001;
                }
            }

            // Attraction (edges)
            edges.forEach(edge => {
                const sourceIdx = nodePositions.findIndex(n => n.id === edge.source);
                const targetIdx = nodePositions.findIndex(n => n.id === edge.target);
                if (sourceIdx === -1 || targetIdx === -1) return;

                const dx = nodePositions[targetIdx].fx - nodePositions[sourceIdx].fx;
                const dy = nodePositions[targetIdx].fy - nodePositions[sourceIdx].fy;
                const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
                const attract = (dist * dist) / k;

                nodePositions[sourceIdx].fx += (dx / dist) * attract * 0.0001;
                nodePositions[sourceIdx].fy += (dy / dist) * attract * 0.0001;
                nodePositions[targetIdx].fx -= (dx / dist) * attract * 0.0001;
                nodePositions[targetIdx].fy -= (dy / dist) * attract * 0.0001;
            });
        }

        // Center and scale
        const newNodes = nodePositions.map(n => ({
            ...n,
            position: {
                x: centerX + (n.fx - centerX) * 0.7,
                y: centerY + (n.fy - centerY) * 0.7,
            },
            data: {
                ...n.data,
                position: {
                    x: centerX + (n.fx - centerX) * 0.7,
                    y: centerY + (n.fy - centerY) * 0.7,
                }
            }
        }));
        setNodes(newNodes);
    }, [nodes, edges, setNodes]);

    return {
        applyCircularLayout,
        applyAutoLayout,
        applyForceLayout,
    };
}; 