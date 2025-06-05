import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  applyNodeChanges,
} from "reactflow";
import type { OnNodesChange, NodeProps } from "reactflow";
import { useState, useCallback, useRef, useEffect } from "react";
import "reactflow/dist/style.css";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import {
  createClaimNode,
  type ClaimNode,
  type ClaimType,
  type ClaimData,
} from "../../types/graph";

const CustomNode = ({ data, id }: NodeProps<ClaimData>) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(data.text);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    data.text = text || "Click to edit"; // Ensure there's always some text
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      inputRef.current?.blur();
    }
    e.stopPropagation();
  };

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`w-full h-full flex items-center justify-center ${
        isEditing ? "nodrag" : ""
      }`}
      style={{ minHeight: "40px", minWidth: "100px" }}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onMouseDown={(e) => e.stopPropagation()} // Prevent node drag when selecting text
          className="w-full min-w-[100px] bg-transparent border-none outline-none text-[#1A1A1A] font-josefin text-sm text-center cursor-text"
          style={{
            fontFamily: "inherit",
            fontSize: "inherit",
            lineHeight: "inherit",
            minHeight: "24px",
            padding: "4px",
          }}
          placeholder="Click to edit"
        />
      ) : (
        <div className="w-full text-center break-words min-h-[24px] px-2">
          {text || "Click to edit"}
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  default: CustomNode,
};

const GraphCanvas = () => {
  const [title, setTitle] = useState("Untitled Graph");
  const [isEditing, setIsEditing] = useState(false);
  const [isEvidencePanelOpen, setIsEvidencePanelOpen] = useState(true);
  const [nodes, setNodes] = useState<ClaimNode[]>([]);
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);

  const handleTitleChange = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setIsEditing(false);
    }
  };

  const addNode = (type: ClaimType) => {
    const newNode = createClaimNode("New Claim", type);
    setNodes((nds) => [...nds, newNode]);
    setIsAddNodeOpen(false);
  };

  const onNodesChange: OnNodesChange = (changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds) as ClaimNode[]);
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

                {/* Add Node Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsAddNodeOpen(!isAddNodeOpen)}
                    className="p-2 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <span className="text-sm">Add Node</span>
                  </button>
                  {isAddNodeOpen && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg border border-gray-200 py-1 min-w-[120px] z-10">
                      <button
                        onClick={() => addNode("factual")}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#4FD9BD] hover:bg-opacity-10 text-sm transition-colors"
                      >
                        Factual
                      </button>
                      <button
                        onClick={() => addNode("value")}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#7283D9] hover:bg-opacity-10 text-sm transition-colors"
                      >
                        Value
                      </button>
                      <button
                        onClick={() => addNode("policy")}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#FDD000] hover:bg-opacity-10 text-sm transition-colors"
                      >
                        Policy
                      </button>
                    </div>
                  )}
                </div>

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

            <ReactFlow
              nodes={nodes}
              onNodesChange={onNodesChange}
              nodeTypes={nodeTypes}
              fitView
              className="bg-white h-full"
            >
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
