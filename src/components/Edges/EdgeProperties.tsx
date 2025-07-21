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
    const newEdgeType: EdgeType = newConfidence >= 0 ? "supporting" : "attacking";
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

  // Helper function to get confidence display value
  const getConfidenceDisplay = (conf: number) => {
    const absValue = Math.abs(conf);
    const sign = conf >= 0 ? "+" : "-";
    return `${sign}${Math.round(absValue * 100)}%`;
  };

  return (
    <div
      className="fixed top-24 w-[300px] bg-white rounded-lg shadow-lg p-6 z-50"
      style={{ right: copilotOpen ? "27vw" : "1.5rem", transition: "right 0.3s" }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium">Edge Properties</h2>
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
        {/* Confidence Slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-base font-medium">
              Confidence Level
            </label>
            <span className="text-sm text-gray-500">
              {getConfidenceDisplay(confidence)}
            </span>
          </div>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.01"
            value={confidence}
            onChange={(e) => handleConfidenceChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#7283D9]"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Strong Attack (-100%)</span>
            <span>Neutral (0%)</span>
            <span>Strong Support (+100%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EdgeProperties;
