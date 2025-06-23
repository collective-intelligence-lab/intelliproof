import React, { useState, useEffect } from "react";
import type { ClaimNode, ClaimType } from "../../types/graph";

interface EvidenceCard {
  id: string;
  title: string;
  supportingDocId: string;
  supportingDocName: string;
  excerpt: string;
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
}

const NodeProperties: React.FC<NodePropertiesProps> = ({
  node,
  onClose,
  onUpdate,
  evidenceCards,
  supportingDocuments,
}) => {
  const [text, setText] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (node) {
      setText(node.data.text);
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

  return (
    <div className="fixed right-6 top-24 w-[400px] bg-white rounded-lg shadow-lg p-6 z-50">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-medium">Claim Properties</h2>
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
                  ? "bg-[#38444D] text-[#E5E7EB]"
                  : "bg-[#38444D] bg-opacity-60 text-[#E5E7EB] hover:bg-opacity-80"
              }`}
            >
              Factual
            </button>
            <button
              onClick={() => handleTypeChange("value")}
              className={`px-4 py-2 rounded-md text-base transition-colors ${
                node.data.type === "value"
                  ? "bg-[#6B715C] text-[#E5E7EB]"
                  : "bg-[#6B715C] bg-opacity-60 text-[#E5E7EB] hover:bg-opacity-80"
              }`}
            >
              Value
            </button>
            <button
              onClick={() => handleTypeChange("policy")}
              className={`px-4 py-2 rounded-md text-base transition-colors ${
                node.data.type === "policy"
                  ? "bg-[#A3A7A9] text-[#E5E7EB]"
                  : "bg-[#A3A7A9] bg-opacity-60 text-[#E5E7EB] hover:bg-opacity-80"
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
                  </div>
                );
              })
            ) : (
              <div className="p-4 bg-[#FAFAFA] rounded-md border border-dashed border-gray-300 text-center">
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
