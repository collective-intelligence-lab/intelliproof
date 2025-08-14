import React from "react";
import { BaseEdge, getBezierPath, Position } from "reactflow";
import type { EdgeProps } from "reactflow";
import { EDGE_COLORS, type EdgeType } from "../../types/edges";

// Add edge score classification function
const getEdgeScoreClassification = (edgeScore: number) => {
  if (edgeScore >= -1.00 && edgeScore <= -0.60) {
    return {
      label: "Very Strong Attack",
      color: "#dc2626", // red-600
      bgColor: "#fef2f2", // red-50
      borderColor: "#fecaca" // red-200
    };
  } else if (edgeScore >= -0.59 && edgeScore <= -0.20) {
    return {
      label: "Moderate Attack",
      color: "#ea580c", // orange-600
      bgColor: "#fff7ed", // orange-50
      borderColor: "#fed7aa" // orange-200
    };
  } else if (edgeScore >= -0.19 && edgeScore <= 0.19) {
    return {
      label: "Neutral / Weak",
      color: "#6b7280", // gray-500
      bgColor: "#f9fafb", // gray-50
      borderColor: "#d1d5db" // gray-200
    };
  } else if (edgeScore >= 0.20 && edgeScore <= 0.59) {
    return {
      label: "Moderate Support",
      color: "#16a34a", // green-600
      bgColor: "#f0fdf4", // green-50
      borderColor: "#bbf7d0" // green-200
    };
  } else if (edgeScore >= 0.60 && edgeScore <= 1.00) {
    return {
      label: "Very Strong Support",
      color: "#15803d", // green-700
      bgColor: "#ecfdf5", // green-50
      borderColor: "#86efac" // green-300
    };
  }
  // Default fallback
  return {
    label: "Unknown",
    color: "#6b7280",
    bgColor: "#f9fafb",
    borderColor: "#d1d5db"
  };
};

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
  // Determine edge color based on discrete score classification
  const score = typeof data?.edgeScore === "number" ? data.edgeScore : 0;
  const edgeClassification = getEdgeScoreClassification(score);
  const color: string = edgeClassification.color;

  // Keep arrow marker color in sync with computed stroke color and drop cached id so React Flow regenerates marker
  const computedMarkerStart: any =
    markerStart && typeof markerStart === "object"
      ? (() => {
        const { id: _ignoreId, ...rest } = markerStart as any;
        return { ...rest, color };
      })()
      : markerStart;

  // If there's an end marker, keep it in sync too
  const computedMarkerEnd: any =
    markerEnd && typeof markerEnd === "object"
      ? (() => {
        const { id: _ignoreId, ...rest } = markerEnd as any;
        return { ...rest, color };
      })()
      : markerEnd;

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
        markerStart={computedMarkerStart}
        markerEnd={computedMarkerEnd}
      />
      {/* Edge classification label with color-coded styling */}
      <foreignObject
        x={labelX - 25}
        y={labelY - 8}
        width="50"
        height="16"
        style={{ overflow: "visible" }}
      >
        <div
          style={{
            fontSize: "5px",
            fontFamily: "DM Sans, sans-serif",
            color: edgeClassification.color,
            fontWeight: "500",
            backgroundColor: edgeClassification.bgColor,
            border: `1px solid ${edgeClassification.borderColor}`,
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
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            padding: "1px 2px",
          }}
          title={edgeClassification.label}
        >
          {edgeClassification.label}
        </div>
      </foreignObject>
    </>
  );
};

export default CustomEdge;
