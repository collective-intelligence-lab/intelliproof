import React, { useState } from "react";
import type { ClaimEdge } from "../../types/edges";
import { EDGE_COLORS } from "../../types/edges";
import { HandRaisedIcon } from "@heroicons/react/24/outline";

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

interface Assumption {
  assumption_text: string;
  reasoning: string;
  importance: number;
  confidence: number;
}

interface EdgePropertiesProps {
  edge: ClaimEdge | null;
  onClose: () => void;
  onUpdate: (edgeId: string, updates: Partial<ClaimEdge>) => void;
  copilotOpen?: boolean;
  copilotOffsetPx?: number;
  nodes: any[];
  evidenceCards: any[];
  supportingDocuments: any[];
  edgeReasoning?: string;
  onValidateEdge?: () => void;
}

const EdgeProperties: React.FC<EdgePropertiesProps> = ({
  edge,
  onClose,
  onUpdate,
  copilotOpen,
  copilotOffsetPx,
  nodes,
  evidenceCards,
  supportingDocuments,
  edgeReasoning,
  onValidateEdge,
}) => {
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [isGeneratingAssumptions, setIsGeneratingAssumptions] = useState(false);
  const [assumptionsSummary, setAssumptionsSummary] = useState<any>(null);

  if (!edge) return null;

  // Derive display color/type from discrete score classifications
  const score =
    typeof edge.data?.edgeScore === "number" ? edge.data.edgeScore : 0;

  // Create discrete color classifications based on score ranges
  const getDiscreteEdgeColor = (score: number) => {
    if (score >= -1.00 && score <= -0.60) {
      return "#dc2626"; // red-600 - Very Strong Attack
    } else if (score >= -0.59 && score <= -0.20) {
      return "#ea580c"; // orange-600 - Moderate Attack
    } else if (score >= -0.19 && score <= 0.19) {
      return "#6b7280"; // gray-500 - Neutral / Weak
    } else if (score >= 0.20 && score <= 0.59) {
      return "#16a34a"; // green-600 - Moderate Support
    } else if (score >= 0.60 && score <= 1.00) {
      return "#15803d"; // green-700 - Very Strong Support
    }
    // Default fallback
    return "#6b7280"; // gray-500
  };

  const displayColor = getDiscreteEdgeColor(score);
  const displayType = score < 0 ? "Attacking" : "Supporting";

  const handleGenerateAssumptions = async () => {
    setIsGeneratingAssumptions(true);
    setAssumptions([]);
    setAssumptionsSummary(null);

    try {
      // Find the source and target nodes
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);

      if (!sourceNode || !targetNode) {
        throw new Error(
          "Source or target node not found for the selected edge."
        );
      }

      // Prepare request body
      const requestBody = {
        edge: {
          source: edge.source,
          target: edge.target,
          weight: edge.data.confidence,
        },
        source_node: {
          id: sourceNode.id,
          text: sourceNode.data.text,
          type: sourceNode.data.type,
          evidenceIds: sourceNode.data.evidenceIds || [],
        },
        target_node: {
          id: targetNode.id,
          text: targetNode.data.text,
          type: targetNode.data.type,
          evidenceIds: targetNode.data.evidenceIds || [],
        },
        evidence: evidenceCards,
        supportingDocuments: supportingDocuments,
      };

      console.log(
        `[EdgeProperties] handleGenerateAssumptions: Sending request to /api/ai/generate-assumptions`
      );

      const response = await fetch("/api/ai/generate-assumptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMsg = "Failed to generate assumptions.";
        try {
          const errorData = await response.json();
          if (errorData.detail) errorMsg = errorData.detail;
        } catch { }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      console.log(
        `[EdgeProperties] handleGenerateAssumptions: Received response:`,
        data
      );

      // Set the summary and assumptions
      setAssumptionsSummary({
        "Edge ID": data.edge_id,
        "Edge Type": data.edge_type,
        "Source Node": data.source_node_text,
        "Target Node": data.target_node_text,
        "Relationship Type": data.relationship_type,
        "Overall Confidence": `${Math.round(data.overall_confidence * 100)}%`,
        Summary: data.summary,
      });
      setAssumptions(data.assumptions || []);
    } catch (err: any) {
      console.error(`[EdgeProperties] handleGenerateAssumptions: Error:`, err);
      // You could add error state handling here
    } finally {
      setIsGeneratingAssumptions(false);
    }
  };

  // edge type text/color in the modal follows score sign, not explicit edgeType

  return (
    <div
      className="fixed top-24 w-[400px] bg-white rounded-lg shadow-lg p-6 z-50 font-[DM Sans] font-normal max-h-[80vh] overflow-y-auto"
      style={{
        right:
          typeof copilotOffsetPx === "number" && copilotOffsetPx > 0
            ? copilotOffsetPx + 24
            : 24,
        transition: "right 0.2s ease",
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2
          className="text-lg font-semibold"
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontWeight: "600",
          }}
        >
          Edge Properties
        </h2>
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
          <label
            className="block text-base font-medium mb-2"
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontWeight: "500",
            }}
          >
            <div className="flex items-center gap-2">
              <span>Score:</span>
              <span style={{ color: displayColor }}>
                {typeof edge.data.edgeScore === "number"
                  ? edge.data.edgeScore.toFixed(2)
                  : "0.00"}
              </span>
            </div>
          </label>
        </div>

        {/* Edge Score Classification */}
        <div className="relative">
          <label
            className="block text-base font-medium mb-2"
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontWeight: "500",
            }}
          >
            <div className="flex items-center gap-2">
              <span>Score Classification:</span>
              <span
                style={{
                  color: getEdgeScoreClassification(score).color,
                  backgroundColor: getEdgeScoreClassification(score).bgColor,
                  border: `1px solid ${getEdgeScoreClassification(score).borderColor}`,
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                }}
              >
                {getEdgeScoreClassification(score).label}
              </span>
            </div>
          </label>
        </div>

        {/* Type (read-only) */}
        {/* (Removed Type display block) */}

        {/* Removed Validate Edge divider/heading */}

        {/* Reasoning inline (immediately after Score/Type) */}
        <div className="relative">
          {/* Absolute label so first line appears after it, and wrapped lines start from left */}
          <span
            className="absolute left-0 top-0 text-base font-medium"
            style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 500 }}
          >
            Reasoning:
          </span>
          <p
            className="text-gray-700 font-normal whitespace-pre-wrap break-words m-0"
            style={{
              fontFamily: "DM Sans, sans-serif",
              lineHeight: 1.5,
              wordBreak: "break-word",
              textIndent: 96,
            }}
          >
            {edge.data?.reasoning && edge.data.reasoning.trim().length > 0
              ? edge.data.reasoning
              : edgeReasoning && edgeReasoning.trim().length > 0
                ? edgeReasoning
                : "No reasoning yet — validate this relationship to generate an explanation."}
          </p>
        </div>

        {/* Generate Assumptions Section */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-base font-medium"
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontWeight: "500",
              }}
            >
              Generate Assumptions
            </h3>
            <button
              onClick={handleGenerateAssumptions}
              disabled={isGeneratingAssumptions}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isGeneratingAssumptions
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-[#232F3E] hover:bg-[#1a252f] text-white"
                }`}
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontWeight: "500",
              }}
            >
              <HandRaisedIcon className="w-4 h-4" />
              {isGeneratingAssumptions ? "Generating..." : "Generate"}
            </button>
          </div>

          {/* Assumptions Summary */}
          {assumptionsSummary && (
            <div
              className="mb-4 p-4 rounded-lg border"
              style={{ backgroundColor: "#f0f2f5", borderColor: "#d1d5db" }}
            >
              <h4
                className="text-sm font-medium mb-2"
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontWeight: "500",
                  color: "#232F3E",
                }}
              >
                Summary
              </h4>
              <div className="space-y-1 text-sm">
                {/* Show only Source Node and Target Node (flipped) and Summary */}
                <div className="flex justify-between items-start">
                  <span
                    className="text-gray-600 flex-shrink-0"
                    style={{
                      fontFamily: "DM Sans, sans-serif",
                      fontWeight: "400",
                    }}
                  >
                    Source Node:
                  </span>
                  <span
                    className="text-gray-800 font-medium text-right ml-2"
                    style={{
                      fontFamily: "DM Sans, sans-serif",
                      fontWeight: "500",
                    }}
                  >
                    {String(assumptionsSummary["Target Node"])}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span
                    className="text-gray-600 flex-shrink-0"
                    style={{
                      fontFamily: "DM Sans, sans-serif",
                      fontWeight: "400",
                    }}
                  >
                    Target Node:
                  </span>
                  <span
                    className="text-gray-800 font-medium text-right ml-2"
                    style={{
                      fontFamily: "DM Sans, sans-serif",
                      fontWeight: "500",
                    }}
                  >
                    {String(assumptionsSummary["Source Node"])}
                  </span>
                </div>
                {assumptionsSummary.Summary && (
                  <div
                    className="mt-2 pt-2 border-t"
                    style={{ borderColor: "#d1d5db" }}
                  >
                    <p
                      className="text-gray-700 text-sm"
                      style={{
                        fontFamily: "DM Sans, sans-serif",
                        fontWeight: "400",
                        lineHeight: "1.4",
                      }}
                    >
                      {String(assumptionsSummary.Summary).split(".")[0]}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assumptions List */}
          {assumptions.length > 0 && (
            <div className="space-y-3">
              <h4
                className="text-sm font-medium text-gray-800"
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontWeight: "500",
                }}
              >
                Generated Assumptions (3)
              </h4>
              {assumptions.map((assumption, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-sm font-medium text-gray-800"
                      style={{
                        fontFamily: "DM Sans, sans-serif",
                        fontWeight: "500",
                      }}
                    >
                      Assumption {index + 1}
                    </span>
                    <div className="flex gap-2 text-xs">
                      <span
                        className="px-2 py-1 rounded"
                        style={{
                          fontFamily: "DM Sans, sans-serif",
                          fontWeight: "400",
                          backgroundColor: "#232F3E",
                          color: "white",
                        }}
                      >
                        {Math.round(assumption.importance * 100)}% importance
                      </span>
                    </div>
                  </div>
                  <p
                    className="text-sm text-gray-700 mb-2"
                    style={{
                      fontFamily: "DM Sans, sans-serif",
                      fontWeight: "400",
                      lineHeight: "1.5",
                    }}
                  >
                    {assumption.assumption_text}
                  </p>
                  <p
                    className="text-xs text-gray-600"
                    style={{
                      fontFamily: "DM Sans, sans-serif",
                      fontWeight: "400",
                      lineHeight: "1.4",
                    }}
                  >
                    <span className="font-medium">Reasoning:</span>{" "}
                    {assumption.reasoning}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EdgeProperties;
