import React, { useState, useEffect } from "react";
import type { ClaimNode, ClaimType } from "../../types/graph";
import ContinueButton from "../ContinueButton";
import { InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface EvidenceCard {
  id: string;
  title: string;
  supportingDocId: string;
  supportingDocName: string;
  excerpt: string;
  confidence?: number;
  evaluation?: string;
  reasoning?: string;
}

interface SupportingDocument {
  id: string;
  name: string;
  type: "document" | "image";
  url: string;
  uploadDate: Date;
  uploader: string;
  size?: number;
}

interface NodePropertiesProps {
  node: ClaimNode | null;
  onClose: () => void;
  onUpdate: (nodeId: string, updates: Partial<ClaimNode>) => void;
  evidenceCards: EvidenceCard[];
  supportingDocuments: SupportingDocument[];
  onUpdateEvidenceConfidence: (evidenceId: string, confidence: number) => void;
  onUnlinkEvidence: (evidenceId: string, nodeId: string) => void;
  copilotOpen?: boolean;
  copilotOffsetPx?: number;
  onClassifyClaimType?: (nodeId: string) => Promise<void>;
  onCloneEvidence: (originalEvidenceId: string, nodeId: string) => string;
  evaluationMessages?: Array<{
    role: string;
    content: {
      "Evidence ID": string;
      Evaluation: string;
      Reasoning: string;
      Confidence: string;
    };
    isStructured: boolean;
  }>;
}

const NodeProperties: React.FC<NodePropertiesProps> = ({
  node,
  onClose,
  onUpdate,
  evidenceCards,
  supportingDocuments,
  onUpdateEvidenceConfidence,
  onUnlinkEvidence,
  copilotOpen,
  copilotOffsetPx,
  onClassifyClaimType,
  onCloneEvidence,
  evaluationMessages = [],
}) => {
  const [text, setText] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false); // Track classification loading state
  const [showTooltip, setShowTooltip] = useState(false);
  const [expandedEvidenceId, setExpandedEvidenceId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (node) {
      setText(node.data.text);
    }
  }, [node?.data.text]);

  if (!node) return null;

  const handleTypeChange = (newType: ClaimType) => {
    onUpdate(node.id, {
      data: {
        ...node.data,
        type: newType,
      },
    });
  };

  const handleTextChange = (newText: string) => {
    setText(newText);
    onUpdate(node.id, {
      data: {
        ...node.data,
        text: newText,
      },
    });
  };

  const handleTextBlur = () => {
    if (text !== node.data.text) {
      onUpdate(node.id, {
        data: {
          ...node.data,
          text: text,
        },
      });
    }
  };

  const handleEvidenceDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleEvidenceDragLeave = () => setIsDragOver(false);
  const handleEvidenceDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const evidenceId = e.dataTransfer.getData("application/x-evidence-id");
    if (!evidenceId || !node) return;

    const prevIds = Array.isArray(node.data.evidenceIds)
      ? node.data.evidenceIds
      : [];

    if (!prevIds.includes(evidenceId)) {
      // Clone the evidence and get the new ID
      const clonedEvidenceId = onCloneEvidence(evidenceId, node.id);

      // Update the node with the cloned evidence ID
      onUpdate(node.id, {
        data: {
          ...node.data,
          evidenceIds: [...prevIds, clonedEvidenceId],
        },
      });
    }
  };

  const handleClassifyClaimType = async () => {
    if (!node || !onClassifyClaimType) return;

    setIsClassifying(true);
    try {
      await onClassifyClaimType(node.id);
    } catch (error) {
      console.error("Error classifying claim type:", error);
    } finally {
      setIsClassifying(false);
    }
  };

  return (
    <div
      className="fixed top-24 w-[300px] bg-white rounded-lg shadow-lg p-6 z-50 font-[DM Sans] font-normal"
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
        <h2 className="text-lg font-semibold">Claim Properties</h2>
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
        {/* Claim Credibility Score */}
        <div className="relative">
          <label className="block text-base font-medium mb-2">
            <div className="flex items-center gap-2">
              <span>Claim Credibility Score:</span>
              <span className="text-blue-600">
                {typeof node.data.credibilityScore === "number"
                  ? node.data.credibilityScore.toFixed(2)
                  : "0.00"}
              </span>
              <div className="relative">
                <InformationCircleIcon
                  className="w-4 h-4 text-gray-400 hover:text-blue-600 transition-colors cursor-help"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                />
                {showTooltip && (
                  <div className="absolute top-full right-0 mt-2 w-80 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50">
                    <div className="whitespace-pre-line leading-tight">
                      {`How is this score calculated?

This credibility score combines:
• Evidence scores from attached evidence cards
• Support/attack relationships from connected claims

Formula: tanh(λ × evidence_avg + Σ(edge_weights × connected_scores))

Where:
• λ = 0.7 (70% more importance to evidence over network)
• evidence_avg = average of attached evidence scores
• edge_weights = strength of supporting/attacking connections

Range: 0.00 (least credible) to 1.00 (most credible)`}
                    </div>
                    <div className="absolute bottom-full right-4 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
                  </div>
                )}
              </div>
            </div>
          </label>
        </div>

        {/* Node Type */}
        <div>
          <label className="block text-base font-medium mb-2">Claim Type</label>
          <div className="flex gap-3">
            <button
              onClick={() => handleTypeChange("factual")}
              className={`px-4 py-2 rounded-md text-base transition-colors ${
                node.data.type === "factual"
                  ? "bg-[#aeaeae] text-black"
                  : "bg-[#aeaeae] bg-opacity-60 text-[#aeaeae] hover:bg-opacity-80 hover:text-black"
              }`}
            >
              Factual
            </button>
            <button
              onClick={() => handleTypeChange("value")}
              className={`px-4 py-2 rounded-md text-base transition-colors ${
                node.data.type === "value"
                  ? "bg-[#94bc84] text-black"
                  : "bg-[#94bc84] bg-opacity-60 text-[#889178] hover:bg-opacity-80 hover:text-black"
              }`}
            >
              Value
            </button>
            <button
              onClick={() => handleTypeChange("policy")}
              className={`px-4 py-2 rounded-md text-base transition-colors ${
                node.data.type === "policy"
                  ? "bg-[#91A4C2] text-black"
                  : "bg-[#91A4C2] bg-opacity-60 text-[#888C94] hover:bg-opacity-80 hover:text-black"
              }`}
            >
              Policy
            </button>
          </div>
        </div>

        {/* NEW: Classify Claim Type Button */}
        <div className="w-full">
          <ContinueButton
            onClick={handleClassifyClaimType}
            loading={isClassifying}
            disabled={!node || !onClassifyClaimType}
            className="w-full !bg-[#232F3E] !text-white hover:!bg-[#1A2330]"
          >
            {isClassifying ? "Classifying..." : "Classify Claim Type"}
          </ContinueButton>
        </div>

        {/* Node Text */}
        <div>
          <label className="block text-base font-medium mb-2">Claim Text</label>
          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            onBlur={handleTextBlur}
            className="w-full px-4 py-2.5 bg-[#FAFAFA] rounded-md text-base outline-none focus:ring-1 focus:ring-black min-h-[100px] resize-y"
            placeholder="Enter node text..."
          />
        </div>

        {/* Evidence Section */}
        <div
          onDragOver={handleEvidenceDragOver}
          onDragLeave={handleEvidenceDragLeave}
          onDrop={handleEvidenceDrop}
          className={
            isDragOver ? "ring-2 ring-[#7283D9] rounded-md bg-[#F0F4FF]" : ""
          }
        >
          <div className="flex justify-between items-center mb-2">
            <label className="block text-base font-medium">Evidence</label>
            <span className="text-sm text-gray-500">
              (
              {Array.isArray(node.data.evidenceIds)
                ? node.data.evidenceIds.length
                : 0}{" "}
              pieces)
            </span>
          </div>

          {/* Evidence Cards Container */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {Array.isArray(node.data.evidenceIds) &&
            node.data.evidenceIds.length > 0 ? (
              node.data.evidenceIds.map((eid: string) => {
                const card = evidenceCards.find((c) => c.id === eid);
                if (!card) return null;
                const doc = supportingDocuments.find(
                  (d) => d.id === card.supportingDocId
                );
                const isImage = doc?.type === "image";
                return (
                  <div
                    key={eid}
                    className="p-3 bg-[#FAFAFA] rounded-md border border-gray-200 text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center gap-2">
                      {isImage ? (
                        <img
                          src={doc?.url}
                          alt="preview"
                          className="w-6 h-6 object-cover rounded"
                        />
                      ) : (
                        <span className="w-6 h-6 flex items-center justify-center bg-[#7283D9] text-white rounded text-xs font-bold">
                          DOC
                        </span>
                      )}
                      <div className="font-medium text-xs truncate">
                        {card.title}
                      </div>
                      <a
                        href={doc?.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#7283D9] underline hover:text-[#3c4a8c] ml-auto"
                      >
                        View
                      </a>
                    </div>
                    <div className="text-xs text-gray-700 line-clamp-2 whitespace-pre-line">
                      {card.excerpt}
                    </div>
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs">Score:</span>
                        <span className="text-xs font-semibold">
                          {Math.round((card.confidence ?? 0.5) * 100)}%
                        </span>
                        {card.evaluation && card.reasoning && (
                          <button
                            onClick={() =>
                              setExpandedEvidenceId(
                                expandedEvidenceId === eid ? null : eid
                              )
                            }
                            className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1"
                          >
                            <InformationCircleIcon className="w-3.5 h-3.5" />
                            {expandedEvidenceId === eid
                              ? "Hide analysis"
                              : "Show analysis"}
                          </button>
                        )}
                        <button
                          onClick={() => onUnlinkEvidence(eid, node.id)}
                          className="text-xs text-gray-500 hover:text-red-600 flex items-center gap-1 mt-1"
                        >
                          <XMarkIcon className="w-3.5 h-3.5" />
                          Unlink evidence
                        </button>
                      </div>
                      {expandedEvidenceId === eid && (
                        <div className="text-xs bg-gray-50 p-3 rounded space-y-2">
                          {card.evaluation && card.reasoning && (
                            <>
                              <div>
                                <span className="font-medium">
                                  Evaluation:{" "}
                                </span>
                                {card.evaluation}
                              </div>
                              <div>
                                <span className="font-medium">Reasoning: </span>
                                {card.reasoning}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 bg-[#FAFAFA] rounded-md border border-gray-300 text-center">
                <p className="text-gray-500 text-base">
                  No evidence attached to this node yet.
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  Drag evidence from the left panel to add it here.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeProperties;
