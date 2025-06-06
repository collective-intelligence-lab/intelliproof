import React from "react";
import { BaseEdge, getBezierPath } from "reactflow";
import type { EdgeProps } from "reactflow";
import { EDGE_COLORS, type EdgeType } from "../../types/edges";

interface CustomEdgeData {
  edgeType: EdgeType;
}

const CustomEdge: React.FC<EdgeProps<CustomEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
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

  return (
    <BaseEdge
      path={edgePath}
      markerEnd={markerEnd}
      style={{
        ...style,
        stroke: color,
        strokeWidth: 2,
        strokeDasharray: "none",
        transition: "stroke 0.3s",
      }}
    />
  );
};

export default CustomEdge;
