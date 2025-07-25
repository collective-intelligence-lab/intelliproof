import React, { useState, useEffect } from "react";
import type { ClaimNode, ClaimType } from "../../types/graph";

interface EvidenceCard {
  id: string;
  title: string;
  supportingDocId: string;
  supportingDocName: string;
  excerpt: string;
  confidence?: number;
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
  copilotOpen?: boolean;
}

const NodeProperties: React.FC<NodePropertiesProps> = ({
  node,
  onClose,
  onUpdate,
  evidenceCards,
  supportingDocuments,
  onUpdateEvidenceConfidence,
  copilotOpen,
}) => {
  const [text, setText] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [confidence, setConfidence] = useState(0.5);
  const [editingEvidenceId, setEditingEvidenceId] = useState<string | null>(
    null
  );
  const [editingConfidence, setEditingConfidence] = useState<number>(0.5);

  useEffect(() => {
    if (node) {
      setText(node.data.text);
      setConfidence(node.data.belief || 0.5);
    }
  }, [node]);

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

  const handleConfidenceChange = (newConfidence: number) => {
    setConfidence(newConfidence);
    onUpdate(node.id, {
      data: {
        ...node.data,
        belief: newConfidence,
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
    if (!evidenceId) return;
    const prevIds = Array.isArray(node.data.evidenceIds)
      ? node.data.evidenceIds
      : [];
    if (!prevIds.includes(evidenceId)) {
      onUpdate(node.id, {
        data: {
          ...node.data,
          evidenceIds: [...prevIds, evidenceId],
        },
      });
    }
  };

  const handleEditConfidence = (eid: string, current: number) => {
    setEditingEvidenceId(eid);
    setEditingConfidence(current);
  };

  const handleSaveConfidence = (eid: string) => {
    onUpdateEvidenceConfidence(eid, editingConfidence);
    setEditingEvidenceId(null);
  };

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
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs">Confidence:</span>
                      <span className="text-xs font-semibold">
                        {Math.round((card.confidence ?? 0.5) * 100)}%
                      </span>
                      <button
                        className="ml-2 px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                        onClick={() =>
                          handleEditConfidence(eid, card.confidence ?? 0.5)
                        }
                      >
                        Edit
                      </button>
                    </div>
                    {editingEvidenceId === eid && (
                      <div className="mt-2 p-2 bg-white border rounded shadow">
                        <label className="block text-xs font-medium mb-1">
                          Edit Confidence
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={editingConfidence}
                            onChange={(e) =>
                              setEditingConfidence(parseFloat(e.target.value))
                            }
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#7283D9]"
                          />
                          <span className="text-xs w-10 text-right">
                            {Math.round(editingConfidence * 100)}%
                          </span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                            onClick={() => handleSaveConfidence(eid)}
                          >
                            Save
                          </button>
                          <button
                            className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                            onClick={() => setEditingEvidenceId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
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
