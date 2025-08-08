import React from "react";
import { BaseEdge, getBezierPath, Position } from "reactflow";
import type { EdgeProps } from "reactflow";
import { EDGE_COLORS, type EdgeType } from "../../types/edges";

interface CustomEdgeData {
  edgeType: EdgeType;
  confidence: number;
  edgeScore?: number;
}

// Helper to get a point and tangent on a cubic bezier at t
function cubicBezierPointAndTangent(
  t: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number
) {
  // Point
  const x =
    Math.pow(1 - t, 3) * x0 +
    3 * Math.pow(1 - t, 2) * t * x1 +
    3 * (1 - t) * Math.pow(t, 2) * x2 +
    Math.pow(t, 3) * x3;
  const y =
    Math.pow(1 - t, 3) * y0 +
    3 * Math.pow(1 - t, 2) * t * y1 +
    3 * (1 - t) * Math.pow(t, 2) * y2 +
    Math.pow(t, 3) * y3;
  // Tangent (derivative)
  const dx =
    3 * Math.pow(1 - t, 2) * (x1 - x0) +
    6 * (1 - t) * t * (x2 - x1) +
    3 * Math.pow(t, 2) * (x3 - x2);
  const dy =
    3 * Math.pow(1 - t, 2) * (y1 - y0) +
    6 * (1 - t) * t * (y2 - y1) +
    3 * Math.pow(t, 2) * (y3 - y2);
  return { x, y, dx, dy };
}

// Helper to get control points (from React Flow's getBezierPath logic)
function getControlPoints(
  sourceX: number,
  sourceY: number,
  sourcePosition: Position,
  targetX: number,
  targetY: number,
  targetPosition: Position,
  curvature = 0.25
) {
  let cpx1 = sourceX;
  let cpy1 = sourceY;
  let cpx2 = targetX;
  let cpy2 = targetY;
  if (
    (sourcePosition === Position.Left && targetPosition === Position.Right) ||
    (sourcePosition === Position.Right && targetPosition === Position.Left)
  ) {
    const c = Math.abs(targetX - sourceX) * curvature;
    cpx1 = sourcePosition === Position.Left ? sourceX - c : sourceX + c;
    cpx2 = targetPosition === Position.Left ? targetX - c : targetX + c;
  } else {
    const c = Math.abs(targetY - sourceY) * curvature;
    cpy1 = sourcePosition === Position.Top ? sourceY - c : sourceY + c;
    cpy2 = targetPosition === Position.Top ? targetY - c : targetY + c;
  }
  return [cpx1, cpy1, cpx2, cpy2];
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
  style,
  markerStart,
  markerEnd,
}) => {
  // Determine edge color based on explicit edge type selection (do not change scores)
  let color: string = EDGE_COLORS.supporting;
  if (data?.edgeType === "attacking") {
    color = EDGE_COLORS.attacking;
  } else if (data?.edgeType === "supporting") {
    color = EDGE_COLORS.supporting;
  }

  // Get the bezier path for the edge and label position
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          ...style,
          stroke: color,
          strokeWidth: 2,
          strokeDasharray: "none",
          transition: "stroke 0.3s",
        }}
        markerStart={markerStart}
        markerEnd={markerEnd}
      />
      {/* Edge score label with theme-matching styling */}
      <foreignObject x={labelX - 12} y={labelY - 6} width="22" height="11" style={{ overflow: "visible" }}>
        <div
          style={{
            fontSize: "6px",
            fontFamily: "DM Sans, sans-serif",
            color: "#232F3E",
            fontWeight: "bold",
            backgroundColor: "rgb(247, 245, 245)",
            borderRadius: "3px",
            textAlign: "center",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.1)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            width: "100%",
            lineHeight: "0.8",
          }}
        >
          {(typeof data?.edgeScore === "number" ? data.edgeScore : 0).toFixed(2)}
        </div>
      </foreignObject>
    </>
  );
};

export default CustomEdge;
