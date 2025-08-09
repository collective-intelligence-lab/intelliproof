import React, { useState } from "react";
import type { ClaimEdge } from "../../types/edges";
import { EDGE_COLORS } from "../../types/edges";
import { HandRaisedIcon } from "@heroicons/react/24/outline";

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

  // Derive display color/type from score sign (>= 0 => Supporting/green, < 0 => Attacking/red)
  const score =
    typeof edge.data?.edgeScore === "number" ? edge.data.edgeScore : 0;
  const displayColor =
    score < 0 ? EDGE_COLORS.attacking : EDGE_COLORS.supporting;
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
        } catch {}
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

        {/* Type (read-only) */}
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className="text-base font-medium"
                style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 500 }}
              >
                Type:
              </span>
              <span style={{ color: displayColor }} className="text-base">
                {displayType}
              </span>
            </div>
          </div>
        </div>

        {/* Validate Edge (like copilot) */}
        <div className="border-t border-gray-200 pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-base font-medium"
              style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 500 }}
            >
              Validate Edge
            </h3>
          </div>
        </div>

        {/* Reasoning (formatted like assumption card) */}
        <div className="relative">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {edge.data?.recommendedEdgeType && (
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      edge.data.recommendedEdgeType === "attacking"
                        ? "bg-red-100 text-red-700 border border-red-300"
                        : "bg-green-100 text-green-700 border border-green-300"
                    }`}
                    style={{
                      fontFamily: "DM Sans, sans-serif",
                      fontWeight: 500,
                    }}
                  >
                    Type Recommendation:{" "}
                    {edge.data.recommendedEdgeType === "attacking"
                      ? "Attack"
                      : "Support"}
                  </span>
                )}
              </div>
            </div>
            <span
              className="text-sm font-medium text-gray-800 block mb-1"
              style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 500 }}
            >
              Reasoning
            </span>
            <p
              className="text-sm text-gray-700"
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontWeight: 400,
                lineHeight: "1.5",
              }}
            >
              {edge.data?.reasoning && edge.data.reasoning.trim().length > 0
                ? edge.data.reasoning
                : edgeReasoning && edgeReasoning.trim().length > 0
                ? edgeReasoning
                : "No reasoning yet — validate this relationship to generate an explanation."}
            </p>
          </div>
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isGeneratingAssumptions
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
