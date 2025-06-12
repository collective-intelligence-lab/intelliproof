import React from "react";
import { BaseEdge, getBezierPath } from "reactflow";
import type { EdgeProps } from "reactflow";
import { EDGE_COLORS, type EdgeType } from "../../types/edges";

interface CustomEdgeData {
  edgeType: EdgeType;
}

// Supporting edge: small arrowhead
const ArrowMarker = ({ color }: { color: string }) => (
  <marker
    id="arrow-marker"
    viewBox="0 0 7 7"
    refX="7"
    refY="3.5"
    markerWidth="7"
    markerHeight="7"
    orient="auto-start-reverse"
  >
    <path d="M 0 0 L 7 3.5 L 0 7 z" fill={color} />
  </marker>
);

// Attacking edge: small circle
const CircleMarker = ({ color }: { color: string }) => (
  <marker
    id="circle-marker"
    viewBox="0 0 7 7"
    refX="7"
    refY="3.5"
    markerWidth="7"
    markerHeight="7"
    orient="auto-start-reverse"
  >
    <circle cx="3.5" cy="3.5" r="3" fill={color} />
  </marker>
);

const CustomEdge: React.FC<EdgeProps<CustomEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
}) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const color = EDGE_COLORS[data?.edgeType || "supporting"];
  const isAttacking = data?.edgeType === "attacking";

  return (
    <>
      {isAttacking ? (
        <CircleMarker color={color} />
      ) : (
        <ArrowMarker color={color} />
      )}
      <BaseEdge
        path={edgePath}
        markerStart={isAttacking ? "url(#circle-marker)" : "url(#arrow-marker)"}
        style={{
          ...style,
          stroke: color,
          strokeWidth: 2,
          strokeDasharray: "none",
          transition: "stroke 0.3s",
        }}
      />
    </>
  );
};

export default CustomEdge;
