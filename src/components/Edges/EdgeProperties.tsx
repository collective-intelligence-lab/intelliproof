import React, { useState, useEffect } from "react";
import type { ClaimEdge, EdgeType } from "../../types/edges";
import { EDGE_COLORS } from "../../types/edges";
import { MarkerType } from "reactflow";

interface EdgePropertiesProps {
  edge: ClaimEdge | null;
  onClose: () => void;
  onUpdate: (edgeId: string, updates: Partial<ClaimEdge>) => void;
  copilotOpen?: boolean;
}

const EdgeProperties: React.FC<EdgePropertiesProps> = ({
  edge,
  onClose,
  onUpdate,
  copilotOpen,
}) => {
  const [confidence, setConfidence] = useState(0);

  useEffect(() => {
    if (edge) {
      setConfidence(edge.data.confidence ?? 0);
    }
  }, [edge]);

  if (!edge) return null;

  const handleConfidenceChange = (newConfidence: number) => {
    setConfidence(newConfidence);
    // Determine edge type based on confidence sign
    const newEdgeType: EdgeType =
      newConfidence >= 0 ? "supporting" : "attacking";
    onUpdate(edge.id, {
      data: {
        ...edge.data,
        confidence: newConfidence,
        edgeType: newEdgeType,
      },
      markerStart: {
        type: MarkerType.ArrowClosed,
        color: EDGE_COLORS[newEdgeType],
      },
    });
  };

  // Helper function to get edge type and color based on confidence
  const getEdgeTypeInfo = (conf: number) => {
    if (conf > 0) return { type: "Supporting", color: "#166534" }; // Green for supporting
    if (conf < 0) return { type: "Attacking", color: "#991B1B" }; // Red for attacking
    return { type: "Neutral", color: "#2563EB" }; // Blue for neutral
  };

  const edgeTypeInfo = getEdgeTypeInfo(confidence);

  return (
    <div
      className="fixed top-24 w-[300px] bg-white rounded-lg shadow-lg p-6 z-50 font-[DM Sans] font-normal"
      style={{
        right: copilotOpen ? "27vw" : "1.5rem",
        transition: "right 0.3s",
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Edge Properties</h2>
        <button
          onClick={onClose}
          className="text-2xl text-gray-500 hover:text-gray-700"
          aria-label="Close properties panel"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {/* Score */}
        <div className="relative">
          <label className="block text-base font-medium mb-2">
            <div className="flex items-center gap-2">
              <span>Score:</span>
              <span style={{ color: edgeTypeInfo.color }}>
                {typeof edge.data.edgeScore === "number"
                  ? edge.data.edgeScore.toFixed(2)
                  : "0.00"}
              </span>
            </div>
          </label>
        </div>

        {/* Type */}
        <div className="relative">
          <label className="block text-base font-medium mb-2">
            <div className="flex items-center gap-2">
              <span>Type:</span>
              <span style={{ color: edgeTypeInfo.color }}>
                {edgeTypeInfo.type}
              </span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};

export default EdgeProperties;
