import React, { useState, useEffect } from "react";
import type { ClaimNode, ClaimType } from "../../types/graph";

interface NodePropertiesProps {
  node: ClaimNode | null;
  onClose: () => void;
  onUpdate: (nodeId: string, updates: Partial<ClaimNode>) => void;
}

const NodeProperties: React.FC<NodePropertiesProps> = ({
  node,
  onClose,
  onUpdate,
}) => {
  const [text, setText] = useState("");

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
                  ? "bg-[#4FD9BD] text-white"
                  : "bg-[#4FD9BD] bg-opacity-10 hover:bg-opacity-20"
              }`}
            >
              Factual
            </button>
            <button
              onClick={() => handleTypeChange("value")}
              className={`px-4 py-2 rounded-md text-base transition-colors ${
                node.data.type === "value"
                  ? "bg-[#7283D9] text-white"
                  : "bg-[#7283D9] bg-opacity-10 hover:bg-opacity-20"
              }`}
            >
              Value
            </button>
            <button
              onClick={() => handleTypeChange("policy")}
              className={`px-4 py-2 rounded-md text-base transition-colors ${
                node.data.type === "policy"
                  ? "bg-[#FDD000] text-white"
                  : "bg-[#FDD000] bg-opacity-10 hover:bg-opacity-20"
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
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-base font-medium">Evidence</label>
            <span className="text-sm text-gray-500">(0 pieces)</span>
          </div>

          {/* Evidence Cards Container */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {/* Empty State */}
            <div className="p-4 bg-[#FAFAFA] rounded-md border border-dashed border-gray-300 text-center">
              <p className="text-gray-500 text-base">
                No evidence attached to this node yet.
              </p>
              <p className="text-gray-500 text-sm mt-1">
                Drag evidence from the left panel to add it here.
              </p>
            </div>

            {/* Example Evidence Card (commented out for now) */}
            {/* <div className="p-4 bg-[#FAFAFA] rounded-md border border-gray-200 hover:border-gray-300 transition-colors">
              <div className="flex justify-between items-start">
                <h3 className="text-base font-medium">Evidence Title</h3>
                <button className="text-gray-400 hover:text-gray-600">×</button>
              </div>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                Brief preview of the evidence content that might span multiple lines...
              </p>
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NodeProperties;
