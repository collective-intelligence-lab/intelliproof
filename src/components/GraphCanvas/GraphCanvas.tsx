import { ReactFlow, Background, Controls, BackgroundVariant } from "reactflow";
import { useState } from "react";
import "reactflow/dist/style.css";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { createClaimNode, type ClaimNode } from "../../types/graph";

const GraphCanvas = () => {
  const [title, setTitle] = useState("Untitled Graph");
  const [isEditing, setIsEditing] = useState(false);
  const [isEvidencePanelOpen, setIsEvidencePanelOpen] = useState(true);
  const [nodes, setNodes] = useState<ClaimNode[]>([]);

  const handleTitleChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setIsEditing(false);
    }
  };

  const addNode = () => {
    // Create node in center of viewport with slight random offset
    const newNode = createClaimNode("New Claim", "factual");
    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <div className="w-full h-full relative font-josefin">
      <PanelGroup direction="horizontal">
        {/* Evidence Panel Container */}
        {isEvidencePanelOpen && (
          <Panel defaultSize={20} minSize={15} maxSize={40}>
            <div className="h-full bg-white border-r border-black flex flex-col">
              {/* Panel Header */}
              <div className="p-4 border-b border-black flex justify-between items-center bg-[#FAFAFA]">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-medium tracking-wide uppercase">
                    Evidence
                  </h2>
                  <span className="text-xs text-gray-500 font-medium">
                    (12)
                  </span>
                </div>
                <button
                  onClick={() => setIsEvidencePanelOpen(false)}
                  className="p-1.5 hover:bg-white rounded-md transition-colors"
                  aria-label="Close evidence panel"
                >
                  ←
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search evidence..."
                    className="w-full px-3 py-1.5 bg-[#FAFAFA] rounded-md text-sm outline-none focus:ring-1 focus:ring-black"
                  />
                </div>
              </div>

              {/* Evidence Content */}
              <div className="flex-1 overflow-auto">
                <div className="p-3 flex flex-col gap-3">
                  {/* Placeholder Evidence Items */}
                  <div className="p-3 bg-[#FAFAFA] rounded-md hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-200">
                    <div className="text-sm font-medium mb-1">
                      Evidence Title
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-2">
                      Brief preview of the evidence content that might span
                      multiple lines...
                    </div>
                  </div>
                  <div className="p-3 bg-[#FAFAFA] rounded-md hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-200">
                    <div className="text-sm font-medium mb-1">
                      Another Evidence
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-2">
                      More evidence content preview text here...
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        )}

        {isEvidencePanelOpen && (
          <PanelResizeHandle className="w-1 hover:w-1.5 bg-black/10 hover:bg-black/20 transition-all cursor-col-resize" />
        )}

        {/* Graph Area */}
        <Panel>
          <div className="relative h-full">
            {/* Floating Top Left Navbar */}
            <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-2">
              <div className="flex items-center gap-4">
                {/* Logo */}
                <div className="w-8 h-8 bg-[#7283D9] rounded-md flex items-center justify-center text-white font-medium">
                  IP
                </div>

                {/* Editable Title */}
                <div className="min-w-[120px]">
                  {isEditing ? (
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onKeyDown={handleTitleChange}
                      onBlur={() => setIsEditing(false)}
                      className="bg-transparent border-b border-gray-300 focus:border-[#7283D9] outline-none px-1 font-medium"
                      autoFocus
                    />
                  ) : (
                    <span
                      onClick={() => setIsEditing(true)}
                      className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded text-sm"
                    >
                      {title}
                    </span>
                  )}
                </div>

                {/* Add Node Button */}
                <button
                  onClick={addNode}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <span className="text-sm">Add Node</span>
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-md transition-colors">
                  <span className="text-sm text-gray-700">Button 2</span>
                </button>
              </div>
            </div>

            {/* Floating Top Right Navbar */}
            <div className="absolute top-4 right-4 z-10 bg-white rounded-lg shadow-lg p-2">
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors">
                  <span className="text-sm text-gray-700">Share</span>
                </button>
                <button className="px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors">
                  <span className="text-sm text-gray-700">Export</span>
                </button>
                <button className="px-3 py-1.5 bg-[#7283D9] hover:bg-[#6274ca] text-white rounded-md transition-colors">
                  <span className="text-sm">Save</span>
                </button>
              </div>
            </div>

            {/* Expand Button - Show when panel is closed */}
            {!isEvidencePanelOpen && (
              <button
                onClick={() => setIsEvidencePanelOpen(true)}
                className="absolute left-0 top-1/2 -translate-y-1/2 h-24 px-1 bg-white hover:bg-gray-50 flex items-center justify-center shadow-lg rounded-r transition-colors z-10"
              >
                <span className="text-gray-400 hover:text-gray-600">→</span>
              </button>
            )}

            <ReactFlow nodes={nodes} fitView className="bg-white h-full">
              <Background
                color="#666"
                gap={20}
                size={1}
                variant={BackgroundVariant.Dots}
              />
              <Controls />
            </ReactFlow>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default GraphCanvas;
