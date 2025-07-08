import React, { useState, useEffect } from "react";
import type { ClaimEdge, EdgeType } from "../../types/edges";
import { EDGE_COLORS } from "../../types/edges";
import { MarkerType } from "reactflow";

interface EdgePropertiesProps {
  edge: ClaimEdge | null;
  onClose: () => void;
  onUpdate: (edgeId: string, updates: Partial<ClaimEdge>) => void;
}

const EdgeProperties: React.FC<EdgePropertiesProps> = ({
  edge,
  onClose,
  onUpdate,
}) => {
  const [confidence, setConfidence] = useState(0.5);
  const [edgeType, setEdgeType] = useState<EdgeType>("supporting");

  useEffect(() => {
    if (edge) {
      setConfidence(edge.data.confidence || 0.5);
      setEdgeType(edge.data.edgeType);
    }
  }, [edge]);

  if (!edge) return null;

  const handleTypeChange = (newType: EdgeType) => {
    setEdgeType(newType);
    onUpdate(edge.id, {
      data: {
        ...edge.data,
        edgeType: newType,
      },
      markerStart: {
        type: MarkerType.ArrowClosed,
        color: EDGE_COLORS[newType],
      },
    });
  };

  const handleConfidenceChange = (newConfidence: number) => {
    setConfidence(newConfidence);
    onUpdate(edge.id, {
      data: {
        ...edge.data,
        confidence: newConfidence,
      },
    });
  };

  return (
    <div className="fixed right-6 top-24 w-[400px] bg-white rounded-lg shadow-lg p-6 z-50">
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
        {/* Edge Type */}
        <div>
          <label className="block text-base font-medium mb-2">Edge Type</label>
          <div className="flex gap-3">
            <button
              onClick={() => handleTypeChange("supporting")}
              className={`px-4 py-2 rounded-md text-base transition-colors ${
                edge.data.edgeType === "supporting"
                  ? "bg-[#166534] text-white"
                  : "bg-[#166534] bg-opacity-60 text-[#166534] hover:bg-opacity-80 hover:text-white"
              }`}
            >
              Supporting
            </button>
            <button
              onClick={() => handleTypeChange("attacking")}
              className={`px-4 py-2 rounded-md text-base transition-colors ${
                edge.data.edgeType === "attacking"
                  ? "bg-[#991B1B] text-white"
                  : "bg-[#991B1B] bg-opacity-60 text-[#991B1B] hover:bg-opacity-80 hover:text-white"
              }`}
            >
              Attacking
            </button>
          </div>
        </div>

        {/* Confidence Slider */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-base font-medium">
              Confidence Level
            </label>
            <span className="text-sm text-gray-500">
              {Math.round(confidence * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={confidence}
            onChange={(e) => handleConfidenceChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#7283D9]"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EdgeProperties;
